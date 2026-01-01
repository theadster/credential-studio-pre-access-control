# Operator Monitoring Dashboard Integration

## Overview

The Operator Monitoring Dashboard has been successfully integrated into the main CredentialStudio dashboard as a new tab, providing real-time visibility into database operator performance and feature flag management.

## Location

The monitoring dashboard is accessible from the main dashboard navigation sidebar as **"Operator Monitoring"**.

### Access Control

- **Visibility**: Only visible to users with the **Super Administrator** role
- **Reason**: Feature flag management and operator metrics are sensitive administrative functions that should only be accessible to super administrators

## Features

### 1. Real-Time Metrics Display

The dashboard displays key performance indicators:

- **Total Calls**: Total number of operator operations executed
- **Error Rate**: Percentage of failed operations (alerts if > 5%)
- **Average Latency**: Mean execution time for operations
- **Fallback Rate**: Percentage of operations that fell back to traditional updates (alerts if > 10%)

### 2. Alert Notifications

Automatic alerts are displayed when thresholds are exceeded:

- Error rate > 5%
- Fallback rate > 10%
- P95 latency > 500ms
- P99 latency > 1000ms

### 3. Feature Flag Management

Super administrators can enable/disable operator features in real-time:

- **Master Switch**: Enable/disable all operator features
- **Credential Operators**: Atomic credential count tracking
- **Photo Operators**: Atomic photo upload count tracking
- **Bulk Operators**: Optimized bulk operations
- **Logging Operators**: Server-side timestamps for logs
- **Array Operators**: Atomic array operations for custom fields

### 4. Performance Details

Detailed performance metrics:

- Average latency
- P95 latency (95th percentile)
- P99 latency (99th percentile)
- Success rate

### 5. Auto-Refresh

The dashboard automatically refreshes every 30 seconds to provide up-to-date metrics.

## Navigation

### Accessing the Dashboard

1. Log in as a Super Administrator
2. Look for **"Operator Monitoring"** in the sidebar navigation
3. Click to view the monitoring dashboard

### Dashboard Location in Sidebar

The monitoring tab appears in the sidebar after the "Activity Logs" tab and before the "Help Center" button:

```
- Attendees
- Event Settings
- User Management
- Roles
- Activity Logs
- Operator Monitoring  ← New tab (Super Admin only)
- Help Center
```

## Integration Details

### Files Modified

**`src/pages/dashboard.tsx`**:
- Added import for `OperatorMonitoringDashboard` component
- Added navigation button in sidebar (Super Administrator only)
- Added tab title and description in header
- Added tab content section with `<OperatorMonitoringDashboard />` component

### Code Changes

1. **Import Statement**:
   ```typescript
   import OperatorMonitoringDashboard from "@/components/OperatorMonitoringDashboard";
   ```

2. **Sidebar Navigation** (lines ~2600):
   ```typescript
   {currentUser?.role?.name === 'Super Administrator' && (
     <Button
       variant={activeTab === "monitoring" ? "default" : "ghost"}
       className="w-full justify-start text-base"
       onClick={() => setActiveTab("monitoring")}
     >
       <BarChart3 className="mr-2 h-4 w-4" />
       Operator Monitoring
     </Button>
   )}
   ```

3. **Header Title** (lines ~2670):
   ```typescript
   {activeTab === "monitoring" && "Operator Monitoring"}
   ```

4. **Header Description** (lines ~2680):
   ```typescript
   {activeTab === "monitoring" && "Monitor database operator performance and manage feature flags"}
   ```

5. **Tab Content** (lines ~5130):
   ```typescript
   {activeTab === "monitoring" && (
     <div className="space-y-6">
       <OperatorMonitoringDashboard />
     </div>
   )}
   ```

## API Endpoints Used

The dashboard communicates with the following API endpoints:

### Metrics Endpoint
```
GET /api/operators/metrics
```
Returns current operator metrics, recent logs, alerts, and feature flags.

### Feature Flags Endpoint
```
GET /api/operators/feature-flags
PUT /api/operators/feature-flags
```
Retrieves and updates feature flag settings.

## Usage Scenarios

### Scenario 1: Monitoring During Rollout

During the gradual rollout of operators:

1. Navigate to Operator Monitoring tab
2. Enable a feature (e.g., Credential Operators)
3. Monitor metrics for 24 hours
4. Check error rate, fallback rate, and latency
5. If metrics are good, enable next feature
6. If issues detected, disable the feature immediately

### Scenario 2: Troubleshooting Issues

If users report issues:

1. Check the monitoring dashboard for alerts
2. Review error rate and recent logs
3. Check which features are enabled
4. Disable problematic features if needed
5. Investigate root cause

### Scenario 3: Performance Optimization

For ongoing optimization:

1. Review P95 and P99 latency metrics
2. Identify slow operations
3. Check fallback rate for optimization opportunities
4. Monitor trends over time

## Best Practices

### 1. Regular Monitoring

- Check the dashboard daily during rollout
- Review metrics weekly after full deployment
- Set up external monitoring for production alerts

### 2. Feature Flag Management

- Enable one feature at a time
- Monitor for 24 hours before enabling next feature
- Document changes and reasons
- Use master switch for emergency rollback

### 3. Alert Response

- Investigate alerts immediately
- Document findings and resolutions
- Adjust thresholds if needed
- Communicate issues to team

### 4. Performance Tracking

- Track metrics trends over time
- Compare before/after performance
- Document improvements
- Share results with stakeholders

## Troubleshooting

### Dashboard Not Visible

**Issue**: Monitoring tab doesn't appear in sidebar

**Solution**: 
- Verify you're logged in as Super Administrator
- Check `currentUser?.role?.name === 'Super Administrator'`
- Refresh the page

### Metrics Not Loading

**Issue**: Dashboard shows loading spinner indefinitely

**Solution**:
- Check browser console for errors
- Verify API endpoints are accessible
- Check authentication token is valid
- Verify user has admin permissions

### Feature Flags Not Updating

**Issue**: Toggling feature flags doesn't work

**Solution**:
- Check browser console for errors
- Verify PUT request to `/api/operators/feature-flags` succeeds
- Check user has Super Administrator role
- Refresh the page to see current state

## Security Considerations

### Access Control

- Only Super Administrators can access the monitoring dashboard
- Feature flag changes are logged
- API endpoints require authentication
- Sensitive metrics are protected

### Audit Trail

All feature flag changes are logged with:
- User ID who made the change
- Timestamp of change
- What was changed
- Previous and new values

## Future Enhancements

Potential improvements for the monitoring dashboard:

1. **Historical Metrics**: Store and display metrics over time
2. **Graphical Charts**: Add charts for trend visualization
3. **Export Functionality**: Export metrics to CSV/JSON
4. **Custom Alerts**: Configure custom alert thresholds
5. **Slack Integration**: Send alerts to Slack channels
6. **Email Notifications**: Email alerts for critical issues
7. **Comparison View**: Compare metrics across time periods
8. **Operator-Specific Metrics**: Drill down into specific operator types

## Conclusion

The Operator Monitoring Dashboard is now fully integrated into the main CredentialStudio dashboard, providing Super Administrators with real-time visibility and control over database operator features. The dashboard enables safe, monitored rollout of operators with quick rollback capabilities if issues arise.

For deployment procedures, see the [Operator Deployment Guide](./OPERATOR_DEPLOYMENT_GUIDE.md).
