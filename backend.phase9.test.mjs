import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from './server/src/app.js';
import User from './server/src/models/user.js';
import Post from './server/src/models/post.js';
import Project from './server/src/models/project.js';
import BuildLog from './server/src/models/buildLog.js';

describe('Phase 9 — Build Logs and Project Journals', () => {
  let userA, userB;
  let cookieA, cookieB;
  let publicProject, privateProject;
  let log1, log2, log3;

  beforeAll(async () => {
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/miniproject_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }

    const ts = Date.now();

    // Register User A (Project Creator)
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p9_alice_${ts}`,
        name: 'Alice Architect',
        email: `alice_${ts}@postifytest.com`,
        password: 'Password123!'
      });
    userA = resA.body.user;
    cookieA = resA.headers['set-cookie'][0].split(';')[0];

    // Register User B (Independent / Unauthorized User)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        username: `p9_bob_${ts}`,
        name: 'Bob Observer',
        email: `bob_${ts}@postifytest.com`,
        password: 'Password123!'
      });
    userB = resB.body.user;
    cookieB = resB.headers['set-cookie'][0].split(';')[0];

    // Seed legacy selectedProjects on User A to verify non-destructive backwards compatibility
    await User.findByIdAndUpdate(userA._id, {
      selectedProjects: [
        {
          name: 'Legacy Cloud Toolkit',
          description: 'A pre-Phase 9 cloud utilities library showcased on profile',
          projectUrl: 'https://github.com/alice/legacy-cloud-toolkit',
          techStack: ['Python', 'AWS', 'Docker']
        }
      ]
    });
  });

  afterAll(async () => {
    // Clean up test data created during this suite from miniproject_test
    if (userA?._id) {
      await Project.deleteMany({ owner: userA._id });
      await BuildLog.deleteMany({ author: userA._id });
      await User.findByIdAndDelete(userA._id);
    }
    if (userB?._id) {
      await Project.deleteMany({ owner: userB._id });
      await BuildLog.deleteMany({ author: userB._id });
      await User.findByIdAndDelete(userB._id);
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  describe('1. Project ownership, validation, and slug generation', () => {
    it('creates a public project with normalized techStack and auto-generated slug', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Distributed Task Engine',
          shortDescription: 'High-throughput async job scheduling system',
          description: '### System Architecture\nUses Raft for consensus and Redis for queues.',
          techStack: ['Go', 'Redis', 'gRPC', 'Docker'],
          repositoryUrl: 'https://github.com/alice/task-engine',
          liveUrl: 'https://taskengine.dev',
          status: 'in_progress',
          visibility: 'public'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.project).toBeDefined();
      expect(res.body.project.name).toBe('Distributed Task Engine');
      expect(res.body.project.slug).toBe('distributed-task-engine');
      expect(res.body.project.owner._id || res.body.project.owner).toBe(userA._id);
      expect(res.body.project.techStack).toEqual(['Go', 'Redis', 'gRPC', 'Docker']);
      expect(res.body.project.visibility).toBe('public');

      publicProject = res.body.project;
    });

    it('generates a unique slug with collision avoidance when the same owner creates another project with the same name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Distributed Task Engine',
          shortDescription: 'Second instance with slug collision',
          visibility: 'public'
        });

      expect(res.status).toBe(201);
      expect(res.body.project.slug).toBe('distributed-task-engine-1');

      // Cleanup duplicate
      await Project.findByIdAndDelete(res.body.project._id);
    });

    it('permits two different users to own projects with identical slugs and resolves unambiguously via /api/projects/user/:username/:slug', async () => {
      // User B creates a project with the same name and slug as User A
      const resBob = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieB)
        .send({
          name: publicProject.name,
          shortDescription: "Bob's independent implementation of the same project idea",
          visibility: 'public'
        });

      expect(resBob.status).toBe(201);
      expect(resBob.body.project.slug).toBe(publicProject.slug); // Identical slug allowed!

      // Scoped resolution for User A
      const resA = await request(app)
        .get(`/api/projects/user/${userA.username}/${publicProject.slug}`);
      expect(resA.status).toBe(200);
      expect(resA.body.project._id).toBe(publicProject._id);
      expect(resA.body.project.owner.username).toBe(userA.username);

      // Scoped resolution for User B
      const resB = await request(app)
        .get(`/api/projects/user/${userB.username}/${publicProject.slug}`);
      expect(resB.status).toBe(200);
      expect(resB.body.project._id).toBe(resBob.body.project._id);
      expect(resB.body.project.owner.username).toBe(userB.username);

      // Clean up Bob's duplicate project
      await Project.findByIdAndDelete(resBob.body.project._id);
    });

    it('rejects project creation with missing or empty name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: '',
          shortDescription: 'No name provided'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name is required/i);
    });

    it('rejects invalid or dangerous protocol URLs (e.g. javascript:)', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Malicious Project',
          repositoryUrl: 'javascript:alert(document.cookie)'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/repository.*must start with/i);
    });

    it('rejects invalid status and visibility enum values', async () => {
      const resStatus = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Invalid Status Project',
          status: 'non_existent_status'
        });
      expect(resStatus.status).toBe(400);

      const resVis = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Invalid Visibility Project',
          visibility: 'secret_hidden'
        });
      expect(resVis.status).toBe(400);
    });

    it('prevents mass assignment of owner field', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Tamper Owner Project',
          owner: userB._id
        });

      expect(res.status).toBe(201);
      // Owner must still be userA (from authenticated session), not userB
      expect(res.body.project.owner._id || res.body.project.owner).toBe(userA._id);
      await Project.findByIdAndDelete(res.body.project._id);
    });

    it('allows owner to update project details', async () => {
      const res = await request(app)
        .patch(`/api/projects/${publicProject._id}`)
        .set('Cookie', cookieA)
        .send({
          status: 'completed',
          shortDescription: 'Updated summary: fully distributed engine'
        });

      expect(res.status).toBe(200);
      expect(res.body.project.status).toBe('completed');
      expect(res.body.project.shortDescription).toBe('Updated summary: fully distributed engine');
    });

    it('denies non-owner from updating or deleting the project', async () => {
      const resPatch = await request(app)
        .patch(`/api/projects/${publicProject._id}`)
        .set('Cookie', cookieB)
        .send({ name: 'Hacked by Bob' });

      expect(resPatch.status).toBe(403);
      expect(resPatch.body.message).toMatch(/not authorized/i);

      const resDelete = await request(app)
        .delete(`/api/projects/${publicProject._id}`)
        .set('Cookie', cookieB);

      expect(resDelete.status).toBe(403);
    });
  });

  describe('2. Visibility, privacy enforcement, and discovery', () => {
    it('creates a private project for User A', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Secret Proprietary Core',
          shortDescription: 'Internal stealth project with confidential specs',
          techStack: ['Rust', 'WebAssembly'],
          visibility: 'private'
        });

      expect(res.status).toBe(201);
      expect(res.body.project.visibility).toBe('private');
      privateProject = res.body.project;
    });

    it('allows owner to access their private project directly', async () => {
      const res = await request(app)
        .get(`/api/projects/${privateProject.slug}`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.project.name).toBe('Secret Proprietary Core');
    });

    it('strictly denies unrelated user or guest from accessing the private project', async () => {
      // Unrelated User B
      const resB = await request(app)
        .get(`/api/projects/${privateProject.slug}`)
        .set('Cookie', cookieB);

      expect(resB.status).toBe(403);
      expect(resB.body.project).toBeUndefined();

      // Unauthenticated Guest
      const resGuest = await request(app)
        .get(`/api/projects/${privateProject.slug}`);

      expect(resGuest.status).toBe(403);
      expect(resGuest.body.project).toBeUndefined();
    });

    it('excludes private project from public projects directory listing', async () => {
      const res = await request(app)
        .get('/api/projects');

      expect(res.status).toBe(200);
      const names = res.body.projects.map((p) => p.name);
      expect(names).toContain('Distributed Task Engine');
      expect(names).not.toContain('Secret Proprietary Core');
    });

    it('includes private projects in GET /api/projects/my for the owner only', async () => {
      const resA = await request(app)
        .get('/api/projects/my')
        .set('Cookie', cookieA);

      expect(resA.status).toBe(200);
      const myNames = resA.body.projects.map((p) => p.name);
      expect(myNames).toContain('Distributed Task Engine');
      expect(myNames).toContain('Secret Proprietary Core');

      const resB = await request(app)
        .get('/api/projects/my')
        .set('Cookie', cookieB);

      expect(resB.status).toBe(200);
      const bNames = resB.body.projects.map((p) => p.name);
      expect(bNames).not.toContain('Secret Proprietary Core');
    });

    it('never leaks private projects into public profile projects endpoint', async () => {
      const res = await request(app)
        .get(`/api/users/${userA._id}/projects`);

      expect(res.status).toBe(200);
      const names = res.body.projects.map((p) => p.name);
      expect(names).toContain('Distributed Task Engine');
      expect(names).not.toContain('Secret Proprietary Core');
    });

    it('never leaks private projects into search results', async () => {
      const res = await request(app)
        .get('/api/search?q=Proprietary&type=projects');

      expect(res.status).toBe(200);
      expect(res.body.projects).toHaveLength(0);
    });

    it('changing a project from public to private immediately revokes public access', async () => {
      // Create temporary public project
      const tempRes = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Temporary Public Project',
          shortDescription: 'Will be switched to private',
          visibility: 'public'
        });
      const tempProj = tempRes.body.project;

      // Verify public access
      const pubCheck = await request(app).get(`/api/projects/${tempProj.slug}`);
      expect(pubCheck.status).toBe(200);

      // Switch to private
      await request(app)
        .patch(`/api/projects/${tempProj._id}`)
        .set('Cookie', cookieA)
        .send({ visibility: 'private' });

      // Verify immediate revocation for guests
      const privCheck = await request(app).get(`/api/projects/${tempProj.slug}`);
      expect(privCheck.status).toBe(403);

      await Project.findByIdAndDelete(tempProj._id);
    });
  });

  describe('3. Build Log lifecycle and timeline', () => {
    it('creates chronological build log entries for an owned project', async () => {
      // Entry 1: Project Initialization Milestone
      const res1 = await request(app)
        .post(`/api/projects/${publicProject._id}/logs`)
        .set('Cookie', cookieA)
        .send({
          title: 'Project Initialization & Repo Architecture',
          entryType: 'milestone',
          content: 'Established repository structure with monorepo layout and gRPC contracts.',
          tags: ['grpc', 'monorepo', 'go'],
          isPinned: true
        });

      expect(res1.status).toBe(201);
      expect(res1.body.log.title).toBe('Project Initialization & Repo Architecture');
      expect(res1.body.log.entryType).toBe('milestone');
      expect(res1.body.log.isPinned).toBe(true);
      log1 = res1.body.log;

      // Small delay for deterministic createdAt ordering
      await new Promise((r) => setTimeout(r, 20));

      // Entry 2: Feature
      const res2 = await request(app)
        .post(`/api/projects/${publicProject._id}/logs`)
        .set('Cookie', cookieA)
        .send({
          title: 'Implemented Raft Distributed Consensus Protocol',
          entryType: 'feature',
          content: 'Integrated HashiCorp Raft library for leader election and state machine replication.',
          tags: ['raft', 'consensus']
        });

      expect(res2.status).toBe(201);
      log2 = res2.body.log;

      await new Promise((r) => setTimeout(r, 20));

      // Entry 3: Fix / Bug
      const res3 = await request(app)
        .post(`/api/projects/${publicProject._id}/logs`)
        .set('Cookie', cookieA)
        .send({
          title: 'Fixed Memory Leak in TCP Heartbeat Worker',
          entryType: 'fix',
          content: 'Resolved unbuffered channel leak during node network partitions.',
          tags: ['networking', 'bugfix']
        });

      expect(res3.status).toBe(201);
      log3 = res3.body.log;
    });

    it('enforces project ownership: unrelated user cannot publish a build log on another user project', async () => {
      const res = await request(app)
        .post(`/api/projects/${publicProject._id}/logs`)
        .set('Cookie', cookieB)
        .send({
          title: 'Unauthorized Log Entry',
          entryType: 'feature',
          content: 'Attempting to inject log entry into Alice project.'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/only the project owner/i);
    });

    it('validates required fields and validates entryType enum', async () => {
      const resNoTitle = await request(app)
        .post(`/api/projects/${publicProject._id}/logs`)
        .set('Cookie', cookieA)
        .send({
          content: 'Missing title',
          entryType: 'feature'
        });
      expect(resNoTitle.status).toBe(400);

      const resBadType = await request(app)
        .post(`/api/projects/${publicProject._id}/logs`)
        .set('Cookie', cookieA)
        .send({
          title: 'Invalid Entry Type',
          content: 'Valid content',
          entryType: 'invalid_category'
        });
      expect(resBadType.status).toBe(400);
    });

    it('retrieves chronological timeline of build logs with deterministic ordering', async () => {
      const res = await request(app)
        .get(`/api/projects/${publicProject.slug}/logs?order=asc`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(3);
      expect(res.body.logs[0]._id).toBe(log1._id);
      expect(res.body.logs[1]._id).toBe(log2._id);
      expect(res.body.logs[2]._id).toBe(log3._id);
    });

    it('retrieves an individual build log entry by ID', async () => {
      const res = await request(app)
        .get(`/api/projects/${publicProject.slug}/logs/${log2._id}`);

      expect(res.status).toBe(200);
      expect(res.body.log.title).toBe('Implemented Raft Distributed Consensus Protocol');
      expect(res.body.log.author.username).toBe(userA.username);
    });

    it('strictly forbids unauthorized users from accessing build logs of a private project', async () => {
      // Create log on private project
      const privLogRes = await request(app)
        .post(`/api/projects/${privateProject._id}/logs`)
        .set('Cookie', cookieA)
        .send({
          title: 'Confidential Internal Milestone',
          entryType: 'milestone',
          content: 'Top secret algorithmic breakthrough.'
        });
      expect(privLogRes.status).toBe(201);
      const privLog = privLogRes.body.log;

      // Bob attempts to query logs list
      const resList = await request(app)
        .get(`/api/projects/${privateProject.slug}/logs`)
        .set('Cookie', cookieB);
      expect(resList.status).toBe(403);

      // Bob attempts to query individual log
      const resSingle = await request(app)
        .get(`/api/projects/${privateProject.slug}/logs/${privLog._id}`)
        .set('Cookie', cookieB);
      expect(resSingle.status).toBe(403);
    });

    it('allows owner to update and delete their own build log entry', async () => {
      const resUpdate = await request(app)
        .patch(`/api/projects/${publicProject.slug}/logs/${log3._id}`)
        .set('Cookie', cookieA)
        .send({
          title: 'Updated: Fixed Memory Leak in TCP Heartbeat Worker',
          tags: ['networking', 'bugfix', 'performance']
        });

      expect(resUpdate.status).toBe(200);
      expect(resUpdate.body.log.title).toBe('Updated: Fixed Memory Leak in TCP Heartbeat Worker');
      expect(resUpdate.body.log.tags).toContain('performance');

      // Attempt deletion by unauthorized User B
      const resBobDelete = await request(app)
        .delete(`/api/projects/${publicProject.slug}/logs/${log3._id}`)
        .set('Cookie', cookieB);
      expect(resBobDelete.status).toBe(403);

      // Deletion by owner
      const resDelete = await request(app)
        .delete(`/api/projects/${publicProject.slug}/logs/${log3._id}`)
        .set('Cookie', cookieA);
      expect(resDelete.status).toBe(200);

      // Verify deletion
      const resCheck = await request(app)
        .get(`/api/projects/${publicProject.slug}/logs/${log3._id}`);
      expect(resCheck.status).toBe(404);
    });
  });

  describe('4. Discovery, profile integration, and cascading deletion', () => {
    it('discovers public projects via global search by project name and tech stack', async () => {
      const resName = await request(app)
        .get('/api/search?q=Distributed&type=projects');

      expect(resName.status).toBe(200);
      expect(resName.body.projects.length).toBeGreaterThanOrEqual(1);
      const p = resName.body.projects.find((proj) => proj._id === publicProject._id);
      expect(p).toBeDefined();
      expect(p.buildLogCount).toBe(2); // log1 and log2 remaining

      const resTech = await request(app)
        .get('/api/search?q=gRPC&type=projects');
      expect(resTech.status).toBe(200);
      expect(resTech.body.projects.some((proj) => proj._id === publicProject._id)).toBe(true);
    });

    it('discovers public projects via global search by build log content', async () => {
      const resLogContent = await request(app)
        .get('/api/search?q=HashiCorp&type=projects');

      expect(resLogContent.status).toBe(200);
      expect(resLogContent.body.projects.some((proj) => proj._id === publicProject._id)).toBe(true);
    });

    it('preserves legacy selectedProjects on user profile without destruction', async () => {
      const userDoc = await User.findById(userA._id);
      expect(userDoc.selectedProjects).toHaveLength(1);
      expect(userDoc.selectedProjects[0].name).toBe('Legacy Cloud Toolkit');
    });

    it('deleting a project cascades and deletes all its build logs', async () => {
      // Public project currently has log1 and log2
      const beforeLogs = await BuildLog.countDocuments({ project: publicProject._id });
      expect(beforeLogs).toBe(2);

      const resDel = await request(app)
        .delete(`/api/projects/${publicProject._id}`)
        .set('Cookie', cookieA);

      expect(resDel.status).toBe(200);

      // Verify project is deleted
      const checkProj = await Project.findById(publicProject._id);
      expect(checkProj).toBeNull();

      // Verify cascade deletion of build logs
      const afterLogs = await BuildLog.countDocuments({ project: publicProject._id });
      expect(afterLogs).toBe(0);
    });

    it('serves crawler social preview HTML with escaped metadata for public projects', async () => {
      // Re-create a public project for crawler check
      const newProjRes = await request(app)
        .post('/api/projects')
        .set('Cookie', cookieA)
        .send({
          name: 'Crawler Test Engine <script>alert(1)</script>',
          shortDescription: 'Safe crawler summary for social preview',
          visibility: 'public'
        });

      const proj = newProjRes.body.project;

      const crawlerRes = await request(app)
        .get(`/projects/${proj.slug}`)
        .set('User-Agent', 'Twitterbot/1.0');

      expect(crawlerRes.status).toBe(200);
      expect(crawlerRes.text).toContain('<meta property="og:title"');
      // Verify XSS tag was escaped or stripped
      expect(crawlerRes.text).not.toContain('<script>alert(1)</script>');
      expect(crawlerRes.text).toContain('Safe crawler summary for social preview');

      await Project.findByIdAndDelete(proj._id);
    });
  });
});
