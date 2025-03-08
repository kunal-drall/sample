# Frontend Troubleshooting Guide: Blank Screen Issues

## Quick Diagnosis

1. **Check Console Errors**
   - Open browser developer tools (F12)
   - Look for red error messages in the Console tab
   - Pay special attention to React/Next.js hydration warnings

2. **Network Requests**
   - Check Network tab in developer tools
   - Verify all JavaScript chunks are loading
   - Look for failed API/WebSocket connections

3. **Application State**
   - Check localStorage for `lastServer` value
   - Verify WebSocket connection status
   - Monitor game state initialization

## Common Issues & Solutions

### 1. WebSocket Connection Issues

```typescript
// Check if socket connection is failing
const socket = useGameStore.getState().socket;
const status = socket?.getStatus(); // Should be 'connecting' or 'connected'
```

**Solution:**
- Clear localStorage: `localStorage.removeItem('lastServer')`
- Refresh page and select server again
- Check if server URLs are accessible

### 2. Game State Initialization

```typescript
// Debug game state
const state = useGameStore.getState();
console.log('Player ID:', state.playerId);
console.log('Players:', state.players.size);
console.log('Socket Status:', state.socket?.getStatus());
```

**Solution:**
- Ensure `initializeGame` is called with valid parameters
- Verify player name and skin are properly set
- Check server selection is complete

### 3. Routing/Navigation Issues

```typescript
// Debug routing
console.log('Current route:', window.location.pathname);
console.log('Search params:', new URLSearchParams(window.location.search));
```

**Solution:**
- Ensure proper URL parameters are present
- Verify Next.js routing configuration
- Check for navigation guard issues

### 4. Component Loading

```typescript
// Add loading states
const [isLoading, setIsLoading] = useState(true);
useEffect(() => {
  // Component setup
  setIsLoading(false);
}, []);
```

**Solution:**
- Add loading indicators
- Implement error boundaries
- Check component mounting lifecycle

## Step-by-Step Debugging

1. **Initial Load**
   - Clear browser cache and localStorage
   - Monitor Network tab for resource loading
   - Check for hydration warnings

2. **State Management**
   - Verify Zustand store initialization
   - Check for proper state updates
   - Monitor WebSocket connection status

3. **Component Rendering**
   - Add console logs in component lifecycle methods
   - Check for proper prop passing
   - Verify conditional rendering logic

4. **Server Connection**
   - Test WebSocket endpoints
   - Verify server selection logic
   - Check connection timeout handling

## Common Code Fixes

### WebSocket Connection Handling
```typescript
useEffect(() => {
  let isActive = true;
  
  const connect = async () => {
    try {
      setIsConnecting(true);
      await initializeGame(playerName, skin);
      if (isActive) setIsConnecting(false);
    } catch (error) {
      console.error('Connection failed:', error);
      if (isActive) {
        setIsConnecting(false);
        setConnectionError(true);
      }
    }
  };
  
  connect();
  return () => { isActive = false; };
}, []);
```

### State Reset on Unmount
```typescript
useEffect(() => {
  return () => {
    // Clean up state
    if (socket) socket.close();
    localStorage.removeItem('lastServer');
  };
}, [socket]);
```

### Error Boundary Implementation
```typescript
class GameErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error, info) {
    console.error('Game error:', error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong. Please refresh.</div>;
    }
    return this.props.children;
  }
}
```

## Prevention Measures

1. **Add Loading States**
   - Implement proper loading indicators
   - Show connection status
   - Handle transition states

2. **Improve Error Handling**
   - Add error boundaries
   - Implement retry mechanisms
   - Show user-friendly error messages

3. **State Management**
   - Clear state on component unmount
   - Handle race conditions
   - Implement proper cleanup

4. **Connection Management**
   - Add connection timeouts
   - Implement reconnection logic
   - Handle server selection properly

## Quick Fixes

1. Clear browser cache and localStorage
2. Verify server URLs are accessible
3. Check for console errors
4. Ensure proper URL parameters
5. Verify WebSocket connection
6. Check state initialization
7. Monitor network requests
8. Verify component mounting

## Additional Resources

- [Next.js Debugging Guide](https://nextjs.org/docs/advanced-features/debugging)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [WebSocket Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket)