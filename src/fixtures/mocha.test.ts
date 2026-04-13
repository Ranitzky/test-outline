// Mocha-specific keywords: suite/specify and x-prefix variants
// The existing sample.test.ts covers describe/context/it basics.

suite('UserService', () => {
  suite('findById', () => {
    it('returns the user when found', async () => {
      const user = await UserService.findById(1);
      assert.strictEqual(user.id, 1);
    });

    it('throws when user does not exist', async () => {
      await assert.rejects(() => UserService.findById(999));
    });

    it.skip('uses cache on second call', async () => {
      await UserService.findById(1);
      await UserService.findById(1);
      assert.strictEqual(cache.hits, 1);
    });
  });

  suite('create', () => {
    specify('saves a new user to the database', async () => {
      const user = await UserService.create({ name: 'Alice', email: 'alice@example.com' });
      assert.ok(user.id);
    });

    specify('rejects duplicate email addresses', async () => {
      await UserService.create({ name: 'Alice', email: 'alice@example.com' });
      await assert.rejects(() =>
        UserService.create({ name: 'Alice 2', email: 'alice@example.com' })
      );
    });

    specify.skip('sends a welcome email', async () => {
      await UserService.create({ name: 'Bob', email: 'bob@example.com' });
      assert.ok(mailer.lastSentTo, 'bob@example.com');
    });
  });

  xdescribe('delete (deprecated)', () => {
    it('removes the user from the database', async () => {
      await UserService.delete(1);
      await assert.rejects(() => UserService.findById(1));
    });

    xit('cleans up related records', async () => {
      await UserService.delete(1);
      assert.strictEqual(await db.count('posts', { userId: 1 }), 0);
    });
  });

  suite.only('permissions', () => {
    it('admin can access all resources', () => {
      assert.ok(can('admin', 'read', 'any'));
      assert.ok(can('admin', 'write', 'any'));
    });

    it('guest can only read public resources', () => {
      assert.ok(can('guest', 'read', 'public'));
      assert.strictEqual(can('guest', 'write', 'public'), false);
    });
  });
});
