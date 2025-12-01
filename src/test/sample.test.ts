describe('scenario name', () => {
  context('context', () => {
    it('test', () => {});
  });

  context('another context', () => {
    it('another test', () => {});

    it('yet another', () => {});

    it.skip('skipped test', () => {});

    it.only('only this test', () => {});
  });

  context('yet another context', () => {
    context('nested context', () => {
      it('test 5', () => {});
    });
  });

  context(
    // comment
    'this is a very long title context that might cause issues if not handled properly even longer',
    () => {
      it.skip(// comment
      'this is a very long test case that could potentially overflow, if not handled properly', () => {});
    }
  );
});
