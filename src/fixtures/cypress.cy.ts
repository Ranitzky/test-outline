describe('login page', () => {
  context('when user is not logged in', () => {
    it('shows the login form', () => {
      cy.visit('/login');
      cy.get('form').should('be.visible');
    });

    it('displays an error on invalid credentials', () => {
      cy.get('[data-cy=email]').type('bad@example.com');
      cy.get('[data-cy=password]').type('wrong');
      cy.get('[data-cy=submit]').click();
      cy.get('[data-cy=error]').should('contain', 'Invalid');
    });

    it.skip('shows forgot password link', () => {
      cy.visit('/login');
      cy.contains('Forgot password').should('be.visible');
    });
  });

  context('when user is logged in', () => {
    beforeEach(() => {
      cy.session('logged-in', () => {
        cy.request('POST', '/api/login', { email: 'user@example.com', password: 'secret' });
      });
    });

    it('redirects to dashboard', () => {
      cy.visit('/login');
      cy.url().should('include', '/dashboard');
    });

    it.only('shows welcome message', () => {
      cy.visit('/dashboard');
      cy.contains('Welcome').should('be.visible');
    });
  });

  // cy.it() must NOT appear in the outline – excluded by negative lookbehind (?<!cy\.)
  context('api mocking', () => {
    it('intercepts network requests', () => {
      cy.intercept('GET', '/api/users').as('getUsers');
      cy.visit('/users');
      cy.wait('@getUsers');
    });

    it.skip('handles failed requests gracefully', () => {
      cy.intercept('GET', '/api/users', { statusCode: 500 }).as('failedUsers');
      cy.visit('/users');
      cy.get('[data-cy=error-banner]').should('be.visible');
    });
  });
});

describe.skip('admin panel', () => {
  it('is only accessible to admins', () => {
    cy.visit('/admin');
    cy.url().should('include', '/login');
  });
});

describe('multiline labels', () => {
  context(
    // comment before the label
    'this is a very long title context that might cause issues if not handled properly even longer',
    () => {
      it.skip(// comment
      'this is a very long test case that could potentially overflow, if not handled properly', () => {});
    }
  );
});
