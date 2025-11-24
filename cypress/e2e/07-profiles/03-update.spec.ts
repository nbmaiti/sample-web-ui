/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

describe('Test Update Profile Page', () => {
  beforeEach('clear cache and login', () => {
    cy.setup()
    
    // Setup intercepts for real API calls
    cy.intercept('GET', '**/profiles*').as('get-profiles')
    cy.intercept('GET', '**/profiles/**').as('get-profile-detail')
    cy.intercept('GET', '**/ciraconfigs*').as('get-configs')
    cy.intercept('GET', '**/wirelessconfigs*').as('get-wireless')
    cy.intercept('GET', '**/ieee8021xconfigs*').as('get-8021x')
    cy.intercept('PATCH', '**/profiles').as('update-profile') // Remove the /** pattern
    cy.intercept('POST', '**/profiles').as('post-profile')
  })

  it('should update an existing profile successfully', () => {
    // Navigate to profiles
    cy.goToPage('Profiles')
    cy.wait('@get-profiles')

    // Create a profile first if none exist
    cy.get('body').then(($body) => {
      if ($body.text().includes('No Profiles')) {
        // Create a test profile first
        cy.get('button').contains('Add New').click()
        cy.wait('@get-configs')
        
        cy.matTextlikeInputType('[formControlName="profileName"]', 'test-profile-to-update')
        cy.matSelectChooseByValue('[formControlName="activation"]', 'acmactivate')
        cy.matCheckboxSet('[formControlName="generateRandomPassword"]', true)
        cy.matCheckboxSet('[formControlName="generateRandomMEBxPassword"]', true)
        cy.matRadioButtonChoose('[formControlName="dhcpEnabled"]', 'true')
        cy.get('[data-cy="radio-tls"]').click()
        cy.matSelectChoose('[formControlName="tlsMode"]', '1')
        
        cy.get('button[type=submit]').click()
        cy.get('button').contains('Continue').click()
        cy.wait('@post-profile')
        
        // Go back to profiles list
        cy.goToPage('Profiles')
        cy.wait('@get-profiles')
      }
    })

    // Click on first profile to edit
    cy.get('mat-row').first().click()
    
    // Wait for the profile detail to load completely
    cy.wait('@get-profile-detail', { timeout: 10000 })
    cy.wait('@get-configs', { timeout: 10000 })
    cy.wait('@get-wireless', { timeout: 10000 })
    cy.wait('@get-8021x', { timeout: 10000 })
    
    // Wait for form to be fully populated with existing data
    // Check for the presence of form elements and that they're initialized
    cy.get('[formControlName="profileName"]').should('be.visible')
    cy.get('[formControlName="activation"]').should('be.visible')
    
    // Wait for the profile name field to have a value (indicating form is populated)
    cy.get('[formControlName="profileName"]').should(($input) => {
      expect($input.val()).to.not.be.empty
    })
    
    // Additional wait for form to stabilize after data loading
    cy.wait(3000)
    
    // Verify we're in edit mode by checking if profile name field is disabled
    cy.get('[formControlName="profileName"]').should('be.disabled')

    // Update the profile using Material UI methods that work reliably in edit mode
    // Note: Profile name cannot be changed in edit mode as it's disabled
    // Note: Some fields like activation mode may be complex to update, so focus on simple changes
    
    // Update checkbox fields that are always available for editing
    cy.matCheckboxSet('[formControlName="kvmEnabled"]', true)
    cy.matCheckboxSet('[formControlName="solEnabled"]', true)
    cy.matCheckboxSet('[formControlName="iderEnabled"]', true)
    
    // Log the current state for debugging
    cy.log('Updated profile checkboxes for KVM, SOL, and IDER capabilities')

    // Submit update
    cy.get('button[type=submit]').should('not.be.disabled').click()
    
    // Log that we've submitted the form
    cy.log('Profile update form submitted')

    // Wait for update API call and verify
    cy.wait('@update-profile', { timeout: 15000 }).then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([200, 204])
      cy.log('Profile updated successfully!')
    })
    
    // Verify navigation back to profiles list
    cy.url().should('include', '/profiles')
    cy.url().should('not.include', '/edit')
  })
})
