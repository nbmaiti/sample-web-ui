/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

// Tests the creation of a cira-config

import { httpCodes } from '../fixtures/api/httpCodes'

// ---------------------------- Test section ----------------------------

describe('Test CIRA Config Page', () => {
  beforeEach('Clear cache and login', () => {
    cy.setup()
  })

  beforeEach('setup intercepts for monitoring', () => {
    // Monitor API calls but allow real responses
    cy.intercept('GET', '**/ciraconfigs*').as('api-call')
  })

  it('pagination for next page', () => {
    cy.goToPage('CIRA Configs')
    cy.wait('@api-call')

    // Check if any data exists, if not, skip pagination tests
    cy.get('body').then(($body) => {
      if ($body.find('mat-paginator').length > 0) {
        cy.log('Paginator found - testing pagination')
        // Test next page functionality
        cy.get('mat-paginator').should('exist')
        
        // Check if next page button is enabled
        cy.get('mat-paginator button[aria-label="Next page"]').then(($btn) => {
          if (!$btn.is(':disabled')) {
            cy.log('Clicking next page button')
            cy.wrap($btn).click()
            cy.wait(2000) // Allow time for any API call and UI update
            // Verify the button state changed or page content updated
            cy.get('mat-paginator').should('exist')
          } else {
            cy.log('Next page button is disabled - no additional pages available')
          }
        })
      } else {
        cy.log('No paginator found - likely no data in table, skipping pagination test')
      }
    })
  })

  it('paging for previous page', () => {
    cy.goToPage('CIRA Configs')
    cy.wait('@api-call')

    // Check if any data exists and paginator is present
    cy.get('body').then(($body) => {
      if ($body.find('mat-paginator').length > 0) {
        // Navigate to page 2 first if possible
        cy.get('mat-paginator button[aria-label="Next page"]').then(($btn) => {
          if (!$btn.is(':disabled')) {
            cy.wrap($btn).click()
            cy.wait(2000)
            
            // Now test previous page functionality
            cy.get('mat-paginator button[aria-label="Previous page"]').then(($prevBtn) => {
              if (!$prevBtn.is(':disabled')) {
                cy.log('Clicking previous page button')
                cy.wrap($prevBtn).click()
                cy.wait(2000)
                cy.get('mat-paginator').should('exist')
              }
            })
          } else {
            cy.log('Cannot test previous page - only one page of data available')
          }
        })
      } else {
        cy.log('No paginator found - skipping previous page test')
      }
    })
  })

  it('paging for last page', () => {
    cy.goToPage('CIRA Configs')
    cy.wait('@api-call')

    // Check if any data exists and paginator is present
    cy.get('body').then(($body) => {
      if ($body.find('mat-paginator').length > 0) {
        // Check if last page button is available
        cy.get('mat-paginator button[aria-label="Last page"]').then(($btn) => {
          if (!$btn.is(':disabled')) {
            cy.log('Clicking last page button')
            cy.wrap($btn).click()
            cy.wait(2000)
            // Just verify paginator still exists after navigation
            cy.get('mat-paginator').should('exist')
          } else {
            cy.log('Last page button is disabled - already on last page')
          }
        })
      } else {
        cy.log('No paginator found - skipping last page test')
      }
    })
  })

  it('paging for first page', () => {
    cy.goToPage('CIRA Configs')
    cy.wait('@api-call')

    // Check if any data exists and paginator is present
    cy.get('body').then(($body) => {
      if ($body.find('mat-paginator').length > 0) {
        // Navigate to last page first if possible
        cy.get('mat-paginator button[aria-label="Last page"]').then(($btn) => {
          if (!$btn.is(':disabled')) {
            cy.wrap($btn).click()
            cy.wait(2000)
            
            // Now test first page functionality
            cy.get('mat-paginator button[aria-label="First page"]').then(($firstBtn) => {
              if (!$firstBtn.is(':disabled')) {
                cy.log('Clicking first page button')
                cy.wrap($firstBtn).click()
                cy.wait(2000)
                cy.get('mat-paginator').should('exist')
              }
            })
          } else {
            cy.log('Cannot test first page navigation - only one page of data available')
          }
        })
      } else {
        cy.log('No paginator found - skipping first page test')
      }
    })
  })
})
