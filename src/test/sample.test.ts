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
});
