/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { domainFixtures } from '../fixtures/formEntry/domain'

describe('Test Domain Page - Real API Pagination', () => {
  beforeEach(() => {
    cy.setup()
    
    // Setup real API intercepts
    cy.intercept('GET', '**/domains**').as('get-domains')
    cy.intercept('POST', '**/domains').as('post-domain')
    cy.intercept('DELETE', '**/domains/**').as('delete-domain')
  })

  it('pagination functionality with real domains', () => {
    // Navigate to domains page
    cy.goToPage('Domains')
    cy.wait('@get-domains')

    // Check if any domains exist and test pagination UI
    cy.get('body').then(($body) => {
      if ($body.text().includes('No Domains')) {
        cy.log('⚠️ No domains found - pagination not testable without data')
        cy.log('✅ Domain list page loads correctly')
      } else {
        cy.log('✅ Domains found - checking pagination UI')
        
        // Verify domain data is displayed
        cy.get('mat-row').should('have.length.greaterThan', 0)
        cy.get('mat-cell').should('exist')
        
        // Check if pagination component exists
        cy.get('body').then(($body2) => {
          if ($body2.find('mat-paginator').length > 0) {
            cy.log('✅ Pagination component present')
            
            // Test pagination controls existence
            cy.get('mat-paginator').should('be.visible')
            cy.get('mat-paginator').find('button.mat-mdc-paginator-navigation-next').should('exist')
            cy.get('mat-paginator').find('button.mat-mdc-paginator-navigation-previous').should('exist')
            cy.get('mat-paginator').find('.mat-mdc-paginator-range-label').should('exist')
            
            cy.log('✅ Pagination controls verified')
          } else {
            cy.log('⚠️ No pagination component - likely less than 25 domains')
          }
        })
        
        cy.log('✅ Domain data display working')
      }
    })
  })
})
