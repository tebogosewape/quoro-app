# Experian Integration - Quick Start Guide

## ✅ What's Done

The **foundation is complete**! You now have:

1. **Full SOAP API Client** - Ready to connect to Experian
2. **Database Schema** - Table to store all credit reports
3. **Type Definitions** - Complete TypeScript interfaces
4. **Documentation** - Setup guide and implementation summary
5. **Configuration Template** - Example environment file

## 🚀 Quick Start (3 Options)

### Option 1: Keep Mock Mode (No Changes Needed)

```bash
# Do nothing - system continues generating mock reports
# Perfect for: Demo, development, testing UI
```

### Option 2: Connect to Experian Sandbox

```bash
# 1. Get sandbox credentials from Experian
# 2. Copy environment template
cp apps/api/.env.experian.example apps/api/.env

# 3. Edit .env with sandbox credentials
EXPERIAN_API_URL=https://sandbox.experian.co.za/cais/webservice/NormalSearchV2
EXPERIAN_SUBSCRIBER_CODE=YOUR_SANDBOX_CODE
EXPERIAN_USERNAME=sandbox_user
EXPERIAN_PASSWORD=sandbox_pass
EXPERIAN_MOCK_MODE=false

# 4. Run database migration
mysql -u root -p quora-app < apps/api/database/migrations/add-credit-reports-table.sql

# 5. Restart API server
cd apps/api && npm run start:dev
```

### Option 3: Full Production Setup

```bash
# Follow Option 2 but use production credentials
# See: documentation/EXPERIAN_SETUP_GUIDE.md
```

## 📋 Next Priority Tasks

### IMMEDIATE (Must Do First)

1. **Run Database Migration**

    ```bash
    mysql -u root -p quora-app < apps/api/database/migrations/add-credit-reports-table.sql
    ```

2. **Choose Your Mode**
    - Mock Mode: Do nothing, keep demo functionality
    - Real Mode: Get Experian credentials, follow Option 2

### HIGH PRIORITY (This Week)

3. **Update ExperianReportService**
    - File: `apps/api/src/clients/experian-report.service.ts`
    - Task: Replace mock generation with real API calls
    - See: `documentation/EXPERIAN_IMPLEMENTATION_SUMMARY.md` for code example

4. **Add Consent Management**
    - Frontend: Add consent dialog before credit check
    - Backend: Validate consent before API call
    - Required for POPIA compliance

### MEDIUM PRIORITY (Next Week)

5. **Update Frontend UI**
    - Remove "MOCK" label from button
    - Add loading state (30+ seconds)
    - Add error handling
    - Show credit report history

6. **Testing**
    - Test with sandbox if available
    - Test error scenarios
    - Performance testing

## 📁 Important Files

### Configuration

- `apps/api/.env.experian.example` - Copy this to `.env` and fill in credentials
- `apps/api/src/clients/clients.module.ts` - Services already registered ✅

### Code to Modify

- `apps/api/src/clients/experian-report.service.ts` - **Main file to update**
- `apps/api/src/clients/clients.controller.ts` - Add consent validation
- `apps/web/src/pages/Clients/ClientDetails.tsx` - Update UI

### Documentation

- `documentation/EXPERIAN_SETUP_GUIDE.md` - **Read this first!**
- `documentation/EXPERIAN_IMPLEMENTATION_SUMMARY.md` - Full status report
- `docs/Experian Normal Search V2 SOAP Interface_V2.17 (20).pdf` - API spec

### Database

- `apps/api/database/migrations/add-credit-reports-table.sql` - **Run this!**
- `apps/api/src/entities/credit-report.entity.ts` - Entity definition

## 💰 Cost Information

Experian charges per credit check:

- **Per Check**: R25-35
- **Monthly Minimum**: R500-1,000
- **Setup Fee**: R5,000-10,000 (one-time)

**Budget for 50 checks/month**: ~R1,500-2,000

## 🔒 POPIA Compliance

Before going live:

- [ ] Add consent dialog
- [ ] Record purpose of each check
- [ ] Set up data retention (365 days default)
- [ ] Implement access controls
- [ ] Create audit trail reports

## 📞 Support

### Need Experian Credentials?

- Email: support@experian.co.za
- Phone: +27 11 799 3400
- Website: https://www.experian.co.za

### Technical Questions?

- Setup Guide: `documentation/EXPERIAN_SETUP_GUIDE.md`
- Implementation: `documentation/EXPERIAN_IMPLEMENTATION_SUMMARY.md`
- API Spec: `docs/Experian Normal Search V2 SOAP Interface_V2.17 (20).pdf`

## 🎯 Decision Time

**Choose ONE path:**

### Path A: Keep Mock Mode ⏸️

```
✅ No changes needed
✅ Continue demos with mock data
✅ No Experian costs
⏳ Switch to real later when ready
```

### Path B: Connect to Sandbox 🧪

```
1. Get sandbox credentials (free)
2. Run migration
3. Configure environment
4. Test integration
5. Debug any issues
```

### Path C: Go to Production 🚀

```
1. Get production credentials ($$$)
2. Run migration
3. Configure environment
4. Update code for real API
5. Add consent management
6. Full testing
7. Deploy
```

## ⚡ Quick Command Reference

```bash
# Run database migration
mysql -u root -p quora-app < apps/api/database/migrations/add-credit-reports-table.sql

# Check if table exists
mysql -u root -p quora-app -e "DESCRIBE credit_reports;"

# Configure environment
cp apps/api/.env.experian.example apps/api/.env
nano apps/api/.env  # Edit with your credentials

# Restart API server
cd apps/api
npm run start:dev

# Run tests (when ready)
npm run test:e2e

# Check Experian integration status
curl http://localhost:3000/api/clients/{clientId}/credit-report \
  -H "Authorization: Bearer {token}"
```

## 🎓 Learning Resources

1. **Start here**: `documentation/EXPERIAN_SETUP_GUIDE.md`
2. **Code examples**: `documentation/EXPERIAN_IMPLEMENTATION_SUMMARY.md`
3. **API reference**: `docs/Experian Normal Search V2 SOAP Interface_V2.17 (20).pdf`
4. **Database schema**: `apps/api/database/migrations/add-credit-reports-table.sql`

## ✨ Summary

**You're ready to go!** The foundation is complete. Now you need to:

1. **Decide**: Mock, Sandbox, or Production?
2. **Run**: Database migration
3. **Configure**: Environment variables (if going real)
4. **Code**: Update ExperianReportService (if going real)
5. **Test**: Everything works as expected

**Estimated time to production**: 2-4 weeks depending on path chosen.

---

**Questions?** Check the full guides in `documentation/` folder.
