---
paths: pages/**/*.jsx
---

# Page Rules

## Routing

- Pages are routed in `index.jsx`
- Route paths use PascalCase: `/Dashboard`, `/Projects`, `/Tasks`
- URL parameters: `/projects/:projectId/dashboard`

## Hub Pages

Hub pages consolidate multiple features with tabs:

- `AIHub.jsx` - Chat, Research, Generate tabs
- `DocumentsHub.jsx` - Library, Studio, Templates tabs

Old routes redirect to hubs for backwards compatibility.

## Page Structure

```javascript
export default function PageName() {
  const { currentWorkspaceId, loading } = useWorkspace();

  if (loading) return <PageLoader />;

  return (
    <div className="page-container">{/* Page content - delegate to feature components */}</div>
  );
}
```

## Responsibilities

- Pages should be relatively thin orchestrators
- Delegate complex logic to feature components
- Handle routing parameters and pass to features
- Manage page-level loading states

## Loading States

- Use `<Suspense>` with `<PageLoader>` fallback for lazy-loaded pages
- Show skeleton UI during data fetching
- Handle error boundaries at page level

## Layout

- Pages are wrapped in `<Layout>` component
- Layout provides sidebar, header, navigation
- Pages render in the main content area
