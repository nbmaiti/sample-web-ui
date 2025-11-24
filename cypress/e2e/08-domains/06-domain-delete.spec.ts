/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

describe('Test Domain Delete', () => {
  beforeEach(() => {
    cy.setup()
    
    // Setup intercepts for real API calls
    cy.intercept('GET', '**/domains*').as('get-domains')
    cy.intercept('DELETE', '**/domains/**').as('delete-domain')
    cy.intercept('POST', '**/domains').as('post-domain')
  })

  it('should delete a domain successfully', () => {
    // Navigate to domains
    cy.goToPage('Domains')
    cy.wait('@get-domains')

    // Create a domain to delete if none exist
    cy.get('body').then(($body) => {
      if ($body.text().includes('No Domains')) {
        cy.get('button').contains('Add New').click()
        
        const certFixtureData: Cypress.FileReference = {
          fileName: 'test-cert.pfx',
          contents: Cypress.Buffer.from(Cypress.env('PROVISIONING_CERT'), 'base64')
        }

        cy.enterDomainInfo(
          'domain-to-delete-' + Date.now(),
          Cypress.env('DOMAIN_SUFFIX'),
          certFixtureData,
          Cypress.env('PROVISIONING_CERT_PASSWORD')
        )
        cy.get('button').contains('SAVE').click()
        cy.wait('@post-domain')
        
        cy.goToPage('Domains')
        cy.wait('@get-domains')
      }
    })

    // Store domain name before deletion for verification
    let domainToDelete = ''
    cy.get('mat-cell').contains('delete').first().parent().parent().within(() => {
      cy.get('mat-cell').first().invoke('text').then((text) => {
        domainToDelete = text.trim()
      })
    })

    // Delete the first domain
    cy.get('mat-cell').contains('delete').first().click()
    cy.get('button').contains('Yes').click()

    // Wait for delete API call and verify
    cy.wait('@delete-domain', { timeout: 15000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 204])
      cy.log('Domain deleted successfully!')
    })

    // Wait for page refresh and verify domain is gone
    cy.wait('@get-domains')
    cy.then(() => {
      if (domainToDelete) {
        cy.contains(domainToDelete).should('not.exist')
      }
    })
  })

  it('should cancel delete when user clicks No', () => {
    cy.goToPage('Domains')
    cy.wait('@get-domains')

    // Ensure at least one domain exists
    cy.get('body').then(($body) => {
      if (!$body.text().includes('No Domains')) {
        // Store domain name before attempted deletion
        let domainName = ''
        cy.get('mat-cell').contains('delete').first().parent().parent().within(() => {
          cy.get('mat-cell').first().invoke('text').then((text) => {
            domainName = text.trim()
          })
        })

        // Try to delete but cancel
        cy.get('mat-cell').contains('delete').first().click()
        cy.get('button').contains('No').click()
        
        // Domain should still exist - no API call should be made
        cy.get('@delete-domain.all').should('have.length', 0)
        cy.then(() => {
          if (domainName) {
            cy.contains(domainName).should('exist')
          }
        })
      }
    })
  })
})
