import { test, expect } from '@playwright/test'

test.describe('Intelligence Phase 1 Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/')
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
  })

  test('Intelligence Dashboard page loads and displays content', async ({ page }) => {
    // Navigate to Intelligence Dashboard
    await page.goto('/v2/orchestrator/intelligence/dashboard')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check that the page title is visible
    await expect(page.getByRole('heading', { name: /Intelligence Dashboard/i })).toBeVisible()
    
    // Check that stats cards are present (they might be loading or show 0)
    const statsSection = page.locator('text=Total Embeddings').or(page.locator('text=Patterns Extracted'))
    await expect(statsSection.first()).toBeVisible({ timeout: 10000 })
    
    // Check that health status section is present
    const healthSection = page.locator('text=System Health')
    await expect(healthSection).toBeVisible({ timeout: 10000 })
    
    // Check that quick action buttons are present
    await expect(page.getByRole('button', { name: /Semantic Search/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Embeddings Status/i })).toBeVisible()
  })

  test('Semantic Search Explorer page loads and displays search interface', async ({ page }) => {
    // Navigate to Semantic Search
    await page.goto('/v2/orchestrator/intelligence/semantic-search')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check that the page title is visible
    await expect(page.getByRole('heading', { name: /Semantic Search Explorer/i })).toBeVisible()
    
    // Check that search input is present
    const searchInput = page.getByPlaceholder(/Enter a query to find similar executions/i)
    await expect(searchInput).toBeVisible()
    
    // Check that search button is present
    await expect(page.getByRole('button', { name: /Search/i })).toBeVisible()
    
    // Check that filters are present
    await expect(page.getByLabel(/Orchestrator/i)).toBeVisible()
    await expect(page.getByLabel(/Status/i)).toBeVisible()
    await expect(page.getByLabel(/Search Type/i)).toBeVisible()
  })

  test('Semantic Search can perform a search', async ({ page }) => {
    // Navigate to Semantic Search
    await page.goto('/v2/orchestrator/intelligence/semantic-search')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Enter a search query
    const searchInput = page.getByPlaceholder(/Enter a query to find similar executions/i)
    await searchInput.fill('test query')
    
    // Click search button
    await page.getByRole('button', { name: /Search/i }).click()
    
    // Wait for search results or empty state
    // The page should show either results or a "no results" message
    await page.waitForTimeout(2000) // Wait for API call
    
    // Check that either results or empty state is shown
    const hasResults = await page.locator('text=Found').isVisible().catch(() => false)
    const hasNoResults = await page.locator('text=No similar executions found').isVisible().catch(() => false)
    
    expect(hasResults || hasNoResults).toBeTruthy()
  })

  test('Embeddings Status page loads and displays status information', async ({ page }) => {
    // Navigate to Embeddings Status
    await page.goto('/v2/orchestrator/intelligence/embeddings')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Check that the page title is visible
    await expect(page.getByRole('heading', { name: /Embeddings Status/i })).toBeVisible()
    
    // Check that stats cards are present
    await expect(page.getByText(/Total Executions/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(/Embedded/i)).toBeVisible({ timeout: 10000 })
    
    // Check that progress bar is present
    await expect(page.getByText(/Embedding Generation Progress/i)).toBeVisible({ timeout: 10000 })
    
    // Check that index status is present
    await expect(page.getByText(/Pinecone Index Status/i)).toBeVisible({ timeout: 10000 })
    
    // Check that tabs are present
    await expect(page.getByRole('tab', { name: /Generation Timeline/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Backfill Operations/i })).toBeVisible()
  })

  test('Embeddings Status backfill controls are accessible', async ({ page }) => {
    // Navigate to Embeddings Status
    await page.goto('/v2/orchestrator/intelligence/embeddings')
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle')
    
    // Click on Backfill Operations tab
    await page.getByRole('tab', { name: /Backfill Operations/i }).click()
    
    // Check that backfill controls are visible
    await expect(page.getByText(/Trigger Backfill/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByLabel(/Orchestrator ID/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Start Backfill/i })).toBeVisible()
  })

  test('Navigation between intelligence pages works', async ({ page }) => {
    // Start at Intelligence Dashboard
    await page.goto('/v2/orchestrator/intelligence/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Click on Semantic Search button
    await page.getByRole('button', { name: /Semantic Search/i }).click()
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the Semantic Search page
    await expect(page.getByRole('heading', { name: /Semantic Search Explorer/i })).toBeVisible()
    
    // Navigate back via sidebar or URL
    await page.goto('/v2/orchestrator/intelligence/embeddings')
    await page.waitForLoadState('networkidle')
    
    // Verify we're on the Embeddings Status page
    await expect(page.getByRole('heading', { name: /Embeddings Status/i })).toBeVisible()
  })

  test('Sidebar navigation includes intelligence pages', async ({ page }) => {
    // Navigate to any page
    await page.goto('/v2/orchestrator/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Check that intelligence pages are in the sidebar
    // The sidebar should be visible and contain the intelligence links
    const sidebar = page.locator('nav').or(page.locator('[role="navigation"]'))
    
    // Check for intelligence dashboard link
    const intelDashboardLink = page.getByRole('link', { name: /Intelligence Dashboard/i })
    await expect(intelDashboardLink).toBeVisible({ timeout: 5000 })
    
    // Check for semantic search link
    const semanticSearchLink = page.getByRole('link', { name: /Semantic Search/i })
    await expect(semanticSearchLink).toBeVisible({ timeout: 5000 })
    
    // Check for embeddings status link
    const embeddingsLink = page.getByRole('link', { name: /Embeddings Status/i })
    await expect(embeddingsLink).toBeVisible({ timeout: 5000 })
  })
})

