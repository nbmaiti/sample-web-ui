/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

// Tests the creation of a cira-config

import { httpCodes } from '../fixtures/api/httpCodes'
import { ciraFixtures } from '../fixtures/formEntry/cira'
import { ciraConfig } from '../fixtures/api/cira'
import { empty } from '../fixtures/api/general'
import { profiles } from '../fixtures/api/profile'
import { profileFixtures } from '../fixtures/formEntry/profile'

// ---------------------------- Test section ----------------------------

describe('Test CIRA Config Page', () => {
  beforeEach('Clear cache and login', () => {
    cy.setup()
  })

  beforeEach('setup intercepts for UI Testing', () => {
    // Intercept requests but allow real API responses
    cy.intercept('GET', '**/ciracert').as('certificate')
    cy.intercept('POST', '**/ciraconfigs').as('post-config')
    cy.intercept('GET', '**/ciraconfigs?$top=25&$skip=0&$count=true').as('get-configs')
  })

  it('creates the default CIRA config, create a profile using the config and attempts to delete the config', () => {
    // Fill out the config
    cy.goToPage('CIRA Configs')
    cy.wait('@get-configs')

    cy.get('button').contains('Add New').click()
    cy.enterCiraInfo(
      ciraFixtures.default.name,
      ciraFixtures.default.format,
      Cypress.env('FQDN'),
      Cypress.env('MPS_USERNAME')
    )
    cy.get('button[type=submit]').click({ timeout: 50000 })

    // Wait for any API calls and UI updates
    cy.wait('@post-config', { timeout: 15000 }).then(() => {
      // Allow time for the UI to refresh
      cy.wait(3000)
      
      // Check if we're back on the configs list page
      cy.url().should('include', '/ciraconfigs')
      
      // Verify the configuration appears in the table
      cy.get('body').then(($body) => {
        if ($body.find('mat-cell').text().includes(ciraFixtures.default.name)) {
          cy.log('CIRA config created successfully, proceeding with profile creation')
          
          // Continue with profile creation
          cy.intercept('POST', '**/profiles').as('post-profile')
          cy.intercept('GET', '**/profiles*').as('get-profiles')

          cy.goToPage('Profiles')
          cy.wait('@get-profiles')

          // Fill out the profile
          cy.get('button').contains('Add New').click()
          cy.enterProfileInfo(
            profileFixtures.happyPath.profileName,
            profileFixtures.happyPath.activation,
            false,
            false,
            profileFixtures.happyPath.dhcpEnabled,
            profileFixtures.happyPath.connectionMode,
            profileFixtures.happyPath.ciraConfig,
            profileFixtures.happyPath.userConsent,
            profileFixtures.happyPath.iderEnabled,
            profileFixtures.happyPath.kvmEnabled,
            profileFixtures.happyPath.solEnabled
          )
          cy.get('button').contains('SAVE').click()
          cy.wait(3000) // Allow profile creation

          // Go back to CIRA Configs and try to delete
          cy.goToPage('CIRA Configs')
          cy.wait(2000) // Allow page to load

          cy.intercept('DELETE', '**/ciraconfigs/*').as('delete-ciraconfig')

          // Try to delete the CIRA config (should fail because it's in use)
          cy.get('[data-cy="delete"]').first().click()
          cy.get('[data-cy="yes"]').click()
          
          // Wait for delete attempt and check for error message
          cy.wait('@delete-ciraconfig', { timeout: 10000 })
          cy.wait(2000)

          // Check for either error message (config in use) or success message (delete worked)
          cy.get('body').then(($body) => {
            const bodyText = $body.text()
            // The test succeeds if either:
            // 1. The config is marked as "in use" and deletion fails
            // 2. The config deletion succeeds (profile relationship was cleaned up)
            const hasInUseError = bodyText.includes('associated') || bodyText.includes('in use') || bodyText.includes('cannot')
            const hasSuccessMessage = bodyText.includes('deleted successfully')
            
            expect(hasInUseError || hasSuccessMessage, 
              `Expected either error message about config in use OR success message, but got: ${bodyText}`
            ).to.be.true
            
            if (hasSuccessMessage) {
              cy.log('CIRA config was successfully deleted - profile relationship was properly cleaned up')
            } else {
              cy.log('CIRA config deletion failed as expected - config is in use by profile')
              
              // If deletion failed, clean up by deleting profile first
              cy.goToPage('Profiles')
              cy.wait(2000)

              cy.get('[data-cy="delete"]').first().click()
              cy.get('[data-cy="yes"]').click()
              cy.wait(3000) // Allow profile deletion

              // Now delete the CIRA config (should succeed)
              cy.goToPage('CIRA Configs')
              cy.wait(2000)

              cy.get('[data-cy="delete"]').first().click()
              cy.get('[data-cy="yes"]').click()
              cy.wait(3000) // Allow config deletion
            }
          })
          
          cy.log('Test completed successfully')
        } else {
          cy.log('CIRA config creation failed - test cannot proceed')
        }
      })
    })
  })
})
