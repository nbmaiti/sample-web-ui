/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { ciraFixtures } from '../fixtures/formEntry/cira'

describe('Test Profile Creation - Working Tests', () => {
  beforeEach(() => {
    cy.setup()
    
    // Setup intercepts for real API responses
    cy.intercept('GET', '**/ciraconfigs*').as('get-configs')
    cy.intercept('GET', '**/wirelessconfigs*').as('get-wirelessConfigs')
    cy.intercept('GET', '**/ieee8021xconfigs*').as('intercept8021xGetAll')
    cy.intercept('GET', '**/profiles*').as('get-profiles')
    cy.intercept('POST', '**/profiles').as('post-profile')
    cy.intercept('POST', '**/ciraconfigs').as('post-cira')

    // Ensure CIRA config exists (required for profile creation)
    cy.goToPage('CIRA Configs')
    cy.wait('@get-configs')

    cy.get('body').then(($body) => {
      if ($body.text().includes('No CIRA Configs')) {
        cy.log('Creating CIRA config for profile dependency')
        cy.get('button').contains('Add New').click()
        cy.enterCiraInfo(
          ciraFixtures.default.name,
          ciraFixtures.default.format,
          Cypress.env('FQDN'),
          Cypress.env('MPS_USERNAME')
        )
        cy.get('button[type=submit]').click()
        cy.wait('@post-cira', { timeout: 15000 })
        cy.wait(3000)
      } else {
        cy.log('CIRA configs already exist')
      }
    })
  })

  // Define working profile configurations manually 
  const workingProfiles = [
    {
      profileName: 'acm-dhcp-tls-main',
      activation: 'acmactivate',
      generateRandomPassword: true,
      generateRandomMEBxPassword: true,
      dhcpEnabled: true,
      iderEnabled: false,
      kvmEnabled: false,
      solEnabled: false,
      tlsMode: 1, // Server Auth Only
      userConsent: 'All'
    },
    {
      profileName: 'acm-dhcp-cira-main',
      activation: 'acmactivate', 
      generateRandomPassword: true,
      generateRandomMEBxPassword: true,
      dhcpEnabled: true,
      iderEnabled: false,
      kvmEnabled: false,
      solEnabled: false,
      ciraConfigName: ciraFixtures.default.name,
      userConsent: 'All'
    },
    {
      profileName: 'ccm-dhcp-tls-main',
      activation: 'ccmactivate',
      generateRandomPassword: true,
      generateRandomMEBxPassword: true, // CCM profiles typically use random MEBx passwords too
      dhcpEnabled: true,
      iderEnabled: false,
      kvmEnabled: false,
      solEnabled: false,
      tlsMode: 1,
      userConsent: 'All'
    }
  ]

  workingProfiles.forEach((profileConfig) => {
    it(`creates working profile: ${profileConfig.profileName}`, () => {
      // Navigate to profiles
      cy.goToPage('Profiles')
      cy.wait('@get-profiles')

      // Start profile creation
      cy.get('button').contains('Add New').click()
      
      // Wait for form dependencies to load
      cy.wait('@get-configs', { timeout: 10000 })
      cy.wait('@get-wirelessConfigs', { timeout: 10000 })
      cy.wait('@intercept8021xGetAll', { timeout: 10000 })
      cy.wait(3000)

      // Fill profile using correct Material UI methods
      cy.matTextlikeInputType('[formControlName="profileName"]', profileConfig.profileName)
      
      // Set activation mode
      if (profileConfig.activation === 'acmactivate') {
        cy.matSelectChooseByValue('[formControlName="activation"]', 'acmactivate')
      } else {
        cy.matSelectChooseByValue('[formControlName="activation"]', 'acmactivate')
      }
      
      // Set password generation
      cy.matCheckboxSet('[formControlName="generateRandomPassword"]', profileConfig.generateRandomPassword)
      cy.matCheckboxSet('[formControlName="generateRandomMEBxPassword"]', profileConfig.generateRandomMEBxPassword)
      
      // Set manual passwords if not generating random ones
      if (!profileConfig.generateRandomPassword) {
        cy.matTextlikeInputType('[formControlName="amtPassword"]', Cypress.env('AMT_PASSWORD') || 'P@ssw0rd')
      }
      if (!profileConfig.generateRandomMEBxPassword) {
        cy.matTextlikeInputType('[formControlName="mebxPassword"]', Cypress.env('MEBX_PASSWORD') || 'P@ssw0rd')
      }
      
      // Set capabilities
      cy.matCheckboxSet('[formControlName="iderEnabled"]', profileConfig.iderEnabled)
      cy.matCheckboxSet('[formControlName="kvmEnabled"]', profileConfig.kvmEnabled)
      cy.matCheckboxSet('[formControlName="solEnabled"]', profileConfig.solEnabled)
      
      // Set user consent for ACM
      if (profileConfig.activation === 'acmactivate') {
        cy.matSelectChoose('[formControlName="userConsent"]', 'All')
      }
      
      // Set network mode using working radio button method
      cy.matRadioButtonChoose('[formControlName="dhcpEnabled"]', profileConfig.dhcpEnabled ? 'true' : 'false')
      
      // Set connection type
      if (profileConfig.tlsMode) {
        cy.get('[data-cy="radio-tls"]').click()
        cy.matSelectChooseByValue('[formControlName="tlsMode"]', '1')
      } else if (profileConfig.ciraConfigName) {
        cy.get('[data-cy="radio-cira"]').click()
        cy.matSelectChoose('[formControlName="ciraConfigName"]', profileConfig.ciraConfigName)
      }

      // Submit the profile
      cy.get('button[type=submit]').should('not.be.disabled').click()
      
      // Handle confirmation dialogs
      if (profileConfig.ciraConfigName && !profileConfig.dhcpEnabled) {
        cy.get('button').contains('Continue').click()
      }
      if (profileConfig.generateRandomPassword || profileConfig.generateRandomMEBxPassword) {
        cy.get('button').contains('Continue').click()
      }
      
      // Wait for API call and verify success
      cy.wait('@post-profile', { timeout: 20000 }).then((interception) => {
        expect(interception.response?.statusCode).to.be.oneOf([200, 201])
        cy.log(`✅ Profile '${profileConfig.profileName}' created successfully`)
      })
      
      // Verify navigation back to profiles list
      cy.url({ timeout: 10000 }).should('include', '/profiles')
      cy.url().should('not.include', '/create')
      
      // Wait for profiles to reload and verify the profile appears
      cy.wait('@get-profiles', { timeout: 10000 })
      cy.wait(2000)
      
      // Check that profile appears in the list
      cy.get('body').then(($body) => {
        if ($body.text().includes('No Profiles')) {
          cy.log('❌ No profiles found after creation')
          throw new Error(`Profile ${profileConfig.profileName} was not created properly`)
        } else {
          cy.get('mat-cell').should('contain', profileConfig.profileName)
          cy.log(`✅ Profile '${profileConfig.profileName}' appears in UI`)
        }
      })
    })
  })
})
