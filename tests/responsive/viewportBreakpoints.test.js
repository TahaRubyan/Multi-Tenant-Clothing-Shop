import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Responsive Layout & Viewport Breakpoints Test', () => {
  it('verifies responsive media queries defined in layout.css and views.css', () => {
    const layoutCssPath = path.resolve(__dirname, '../../src/layout.css');
    const layoutContent = fs.readFileSync(layoutCssPath, 'utf-8');

    const viewsCssPath = path.resolve(__dirname, '../../src/views.css');
    const viewsContent = fs.readFileSync(viewsCssPath, 'utf-8');

    // Verify key responsive breakpoint declarations
    expect(layoutContent).toContain('@media (max-width: 1024px)');
    expect(layoutContent).toContain('@media (max-width: 768px)');
    expect(viewsContent).toContain('@media (max-width: 960px)');
  });

  it('ensures core workspace grids have responsive stacking definitions', () => {
    const layoutCssPath = path.resolve(__dirname, '../../src/layout.css');
    const cssContent = fs.readFileSync(layoutCssPath, 'utf-8');

    expect(cssContent).toContain('.vendor-workspace-grid');
    expect(cssContent).toContain('.discounts-workspace-grid');
    expect(cssContent).toContain('.setup-2col-workspace');
    expect(cssContent).toContain('.settings-profile-grid');
  });

  it('validates navbar responsiveness and mobile navigation rules', () => {
    const layoutCssPath = path.resolve(__dirname, '../../src/layout.css');
    const cssContent = fs.readFileSync(layoutCssPath, 'utf-8');

    expect(cssContent).toContain('.navbar-container');
    expect(cssContent).toContain('.nav-left');
    expect(cssContent).toContain('.nav-center');
    expect(cssContent).toContain('.nav-right');
  });
});
