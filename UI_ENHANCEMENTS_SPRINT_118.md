# Sprint 118: Member Dashboard UI Enhancements

**Sprint:** 118  
**Role:** Frontend & DevOps (07)  
**Layer:** 7 (View)  
**Type:** UI  
**Status:** COMPLETE

---

## Overview

UI improvements based on Q1 2026 member feedback. Addresses top 5 UX issues from `POST_ALLOCATION_REVIEW.md`.

---

## Enhancement 1: Contribution Form UX

**Problem:** Form feels tedious for repeat submissions.

**Solution:** Contribution duplication + templates

### Implementation Spec

**1.1 Duplicate Button**

Location: `ui/src/pages/contributions/index.tsx`

```tsx
// Add to contribution row actions
<IconButton
  icon={<CopyIcon />}
  aria-label="Duplicate contribution"
  onClick={() => handleDuplicate(contribution.id)}
  size="sm"
/>
```

Handler:
```tsx
const handleDuplicate = (id: string) => {
  const original = contributions.find(c => c.id === id);
  router.push({
    pathname: '/contributions/new',
    query: {
      duplicate: id,
      description: original.description,
      hours: original.hours,
      category: original.category
    }
  });
};
```

Form pre-fill: `ui/src/pages/contributions/new.tsx`
```tsx
const { query } = useRouter();
const [form, setForm] = useState({
  description: query.description || '',
  hours: query.hours || '',
  category: query.category || ''
});
```

**1.2 Contribution Templates**

New component: `ui/src/components/contributions/TemplateSelector.tsx`

```tsx
interface Template {
  id: string;
  name: string;
  description: string;
  hours: number;
  category: string;
}

const templates: Template[] = [
  { id: 'dev', name: 'Development Work', description: 'Software development', hours: 0, category: 'labor' },
  { id: 'meet', name: 'Meeting', description: 'Team meeting', hours: 1, category: 'labor' },
  { id: 'doc', name: 'Documentation', description: 'Writing documentation', hours: 0, category: 'labor' }
];

export function TemplateSelector({ onSelect }) {
  return (
    <Select placeholder="Use template...">
      {templates.map(t => (
        <option key={t.id} value={t.id} onClick={() => onSelect(t)}>
          {t.name}
        </option>
      ))}
    </Select>
  );
}
```

Add to form: Show template selector above form, pre-fills on select.

**Acceptance:**
- ✅ Duplicate button on contribution rows
- ✅ Duplicate pre-fills form with original values
- ✅ Template selector with 3+ common templates
- ✅ Template selection pre-fills form

---

## Enhancement 2: Real-Time Updates

**Problem:** Status updates take 5-15 seconds (polling interval).

**Solution:** Reduce polling + optimistic UI updates

### Implementation Spec

**2.1 Reduce Polling Interval**

File: `ui/src/hooks/usePolling.ts`

```tsx
// Before
const DEFAULT_INTERVAL = 15000; // 15s

// After
const DEFAULT_INTERVAL = 3000; // 3s

// Add environment override
const interval = process.env.NEXT_PUBLIC_POLL_INTERVAL 
  ? parseInt(process.env.NEXT_PUBLIC_POLL_INTERVAL)
  : 3000;
```

**2.2 Optimistic UI Updates**

File: `ui/src/hooks/useContributions.ts`

```tsx
const submitContribution = async (data) => {
  // Optimistic update
  const optimisticContribution = {
    id: `temp-${Date.now()}`,
    ...data,
    status: 'pending',
    created_at: new Date().toISOString(),
    _optimistic: true
  };
  
  setContributions(prev => [optimisticContribution, ...prev]);
  
  try {
    const result = await createContribution(data);
    // Replace optimistic with real
    setContributions(prev => 
      prev.map(c => c.id === optimisticContribution.id ? result : c)
    );
    return result;
  } catch (error) {
    // Rollback optimistic
    setContributions(prev => 
      prev.filter(c => c.id !== optimisticContribution.id)
    );
    throw error;
  }
};
```

Visual indicator for optimistic items:
```tsx
{contribution._optimistic && (
  <Badge colorScheme="gray" fontSize="xs">
    Submitting...
  </Badge>
)}
```

**Acceptance:**
- ✅ Polling interval reduced to 3 seconds
- ✅ Optimistic UI shows contribution immediately on submit
- ✅ Visual indicator for pending server confirmation
- ✅ Rollback on error

---

## Enhancement 3: Mobile Experience

**Problem:** Mobile UI functional but not optimized.

**Solution:** Mobile-specific CSS, responsive tables, larger touch targets

### Implementation Spec

**3.1 Mobile-Responsive Tables**

File: `ui/src/components/contributions/ContributionHistory.tsx`

```tsx
// Add mobile card view for small screens
<Box display={{ base: 'block', md: 'none' }}>
  {contributions.map(c => (
    <Card key={c.id} mb={3}>
      <CardBody>
        <Text fontWeight="bold">{c.description}</Text>
        <HStack mt={2} spacing={2}>
          <Badge>{c.status}</Badge>
          <Text fontSize="sm">{c.hours}h</Text>
          <Text fontSize="sm" color="gray.500">
            {formatDate(c.created_at)}
          </Text>
        </HStack>
        <HStack mt={3}>
          <IconButton icon={<ViewIcon />} size="sm" />
          <IconButton icon={<CopyIcon />} size="sm" />
        </HStack>
      </CardBody>
    </Card>
  ))}
</Box>

<Box display={{ base: 'none', md: 'block' }}>
  <Table>
    {/* Desktop table view */}
  </Table>
</Box>
```

**3.2 Larger Touch Targets**

File: `ui/src/styles/globals.css`

```css
/* Mobile touch targets minimum 44x44px */
@media (max-width: 768px) {
  button,
  a,
  input[type="checkbox"],
  input[type="radio"] {
    min-height: 44px;
    min-width: 44px;
  }
  
  /* Increase button padding on mobile */
  .chakra-button {
    padding: 12px 24px !important;
  }
  
  /* Larger form inputs */
  .chakra-input,
  .chakra-select,
  .chakra-textarea {
    min-height: 48px;
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
```

**3.3 Horizontal Scroll for Wide Tables**

```tsx
<Box overflowX="auto" display={{ base: 'block', md: 'none' }}>
  <Table minWidth="600px">
    {/* Table content */}
  </Table>
</Box>
```

**Acceptance:**
- ✅ Card view for mobile (< 768px), table for desktop
- ✅ Touch targets minimum 44x44px on mobile
- ✅ Form inputs prevent iOS zoom (16px font)
- ✅ Horizontal scroll for wide tables on mobile

---

## Enhancement 4: Batch Approval

**Problem:** No way to approve multiple contributions at once.

**Solution:** Checkbox selection + batch actions

### Implementation Spec

**4.1 Selection State**

File: `ui/src/components/approvals/PendingQueue.tsx`

```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const toggleSelection = (id: string) => {
  setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const toggleSelectAll = () => {
  if (selectedIds.size === contributions.length) {
    setSelectedIds(new Set());
  } else {
    setSelectedIds(new Set(contributions.map(c => c.id)));
  }
};
```

**4.2 Selection UI**

```tsx
<Table>
  <Thead>
    <Tr>
      <Th width="40px">
        <Checkbox
          isChecked={selectedIds.size === contributions.length}
          isIndeterminate={selectedIds.size > 0 && selectedIds.size < contributions.length}
          onChange={toggleSelectAll}
        />
      </Th>
      <Th>Member</Th>
      <Th>Description</Th>
      <Th>Hours</Th>
      <Th>Actions</Th>
    </Tr>
  </Thead>
  <Tbody>
    {contributions.map(c => (
      <Tr key={c.id} bg={selectedIds.has(c.id) ? 'blue.50' : undefined}>
        <Td>
          <Checkbox
            isChecked={selectedIds.has(c.id)}
            onChange={() => toggleSelection(c.id)}
          />
        </Td>
        {/* Rest of row */}
      </Tr>
    ))}
  </Tbody>
</Table>
```

**4.3 Batch Actions**

```tsx
{selectedIds.size > 0 && (
  <HStack position="sticky" top={0} bg="white" p={4} borderBottom="1px" borderColor="gray.200" zIndex={10}>
    <Text fontWeight="medium">{selectedIds.size} selected</Text>
    <Spacer />
    <Button
      colorScheme="green"
      onClick={handleBatchApprove}
      leftIcon={<CheckIcon />}
    >
      Approve Selected
    </Button>
    <Button
      colorScheme="red"
      variant="outline"
      onClick={handleBatchReject}
      leftIcon={<CloseIcon />}
    >
      Reject Selected
    </Button>
    <Button variant="ghost" onClick={() => setSelectedIds(new Set())}>
      Clear Selection
    </Button>
  </HStack>
)}
```

**4.4 Batch Processing**

```tsx
const handleBatchApprove = async () => {
  const ids = Array.from(selectedIds);
  
  try {
    setLoading(true);
    
    // Optimistic update
    setContributions(prev =>
      prev.map(c => selectedIds.has(c.id) ? { ...c, status: 'approved' } : c)
    );
    
    // Batch mutation
    await Promise.all(ids.map(id => approveContribution(id)));
    
    setSelectedIds(new Set());
    toast({ title: `${ids.length} contributions approved`, status: 'success' });
  } catch (error) {
    // Rollback + refetch
    refetch();
    toast({ title: 'Batch approval failed', description: error.message, status: 'error' });
  } finally {
    setLoading(false);
  }
};
```

**Acceptance:**
- ✅ Checkbox on each contribution row
- ✅ Select all checkbox in header
- ✅ Visual indicator for selected rows (background color)
- ✅ Batch approve button (sticky header)
- ✅ Batch reject button
- ✅ Optimistic UI updates
- ✅ Clear selection button

---

## Enhancement 5: Approval Notes

**Problem:** Stewards can approve without notes, making audit trail sparse.

**Solution:** Encourage notes with templates + default prompts

### Implementation Spec

**5.1 Approval Modal with Notes**

File: `ui/src/components/approvals/ApprovalModal.tsx`

```tsx
export function ApprovalModal({ contribution, isOpen, onClose }) {
  const [notes, setNotes] = useState('');
  const [template, setTemplate] = useState('');
  
  const noteTemplates = [
    { id: 'verified', text: 'Verified with member — looks good' },
    { id: 'adjusted', text: 'Adjusted hours after discussion' },
    { id: 'standard', text: 'Standard contribution — approved' },
    { id: 'exceptional', text: 'Exceptional work — great contribution' }
  ];
  
  const applyTemplate = (templateId: string) => {
    const template = noteTemplates.find(t => t.id === templateId);
    if (template) {
      setNotes(template.text);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Approve Contribution</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box>
              <Text fontWeight="medium">{contribution.description}</Text>
              <Text fontSize="sm" color="gray.600">
                {contribution.hours} hours — {contribution.member_name}
              </Text>
            </Box>
            
            <FormControl>
              <FormLabel>Approval Notes (Optional)</FormLabel>
              <Select
                placeholder="Use template..."
                onChange={(e) => applyTemplate(e.target.value)}
                mb={2}
              >
                {noteTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.text}</option>
                ))}
              </Select>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this approval..."
                rows={3}
              />
              <FormHelperText>
                Notes help maintain a clear audit trail for governance.
              </FormHelperText>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="green"
            onClick={() => handleApprove(notes)}
          >
            Approve
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
```

**5.2 Notes in Approval History**

File: `ui/src/components/approvals/ApprovalHistory.tsx`

```tsx
<Table>
  <Thead>
    <Tr>
      <Th>Date</Th>
      <Th>Contribution</Th>
      <Th>Approver</Th>
      <Th>Notes</Th>
    </Tr>
  </Thead>
  <Tbody>
    {approvals.map(a => (
      <Tr key={a.id}>
        <Td>{formatDate(a.approved_at)}</Td>
        <Td>{a.contribution_description}</Td>
        <Td>{a.approver_name}</Td>
        <Td>
          {a.notes ? (
            <Text fontSize="sm">{a.notes}</Text>
          ) : (
            <Text fontSize="sm" color="gray.400" fontStyle="italic">
              No notes
            </Text>
          )}
        </Td>
      </Tr>
    ))}
  </Tbody>
</Table>
```

**Acceptance:**
- ✅ Approval modal includes notes field
- ✅ Note templates (4+ options)
- ✅ Helper text encourages notes
- ✅ Notes displayed in approval history
- ✅ "No notes" shown when empty

---

## Testing Plan

### Unit Tests

Location: `ui/src/components/__tests__/`

```typescript
// ContributionForm.test.tsx
describe('Contribution duplication', () => {
  it('pre-fills form from query params', () => {});
  it('duplicates contribution on button click', () => {});
});

// TemplateSelector.test.tsx
describe('Template selection', () => {
  it('renders template options', () => {});
  it('calls onSelect with template data', () => {});
});

// PendingQueue.test.tsx
describe('Batch approval', () => {
  it('toggles individual selection', () => {});
  it('selects all on header click', () => {});
  it('shows batch action buttons when items selected', () => {});
  it('processes batch approval', () => {});
});
```

### E2E Tests

Location: `ui/e2e/enhancements.spec.ts`

```typescript
test('duplicate contribution flow', async ({ page }) => {
  await page.goto('/contributions');
  await page.click('[aria-label="Duplicate contribution"]');
  await expect(page.locator('input[name="description"]')).toHaveValue('Original description');
});

test('batch approval flow', async ({ page }) => {
  await page.goto('/approvals');
  await page.click('thead input[type="checkbox"]'); // Select all
  await page.click('text=Approve Selected');
  await expect(page.locator('.toast')).toContainText('contributions approved');
});

test('mobile responsive view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/contributions');
  await expect(page.locator('[data-testid="mobile-card-view"]')).toBeVisible();
});
```

---

## Deployment Notes

### Environment Variables

Add to `.env.example` and `.env.local`:

```bash
# Polling interval (milliseconds)
NEXT_PUBLIC_POLL_INTERVAL=3000
```

### Migration

No database changes required — all frontend enhancements.

### Rollout

1. Deploy UI updates to staging
2. Test all 5 enhancements manually
3. Run E2E test suite
4. Deploy to production
5. Announce enhancements in member communication

---

## Documentation Updates

### User Guide

Add to `docs/user-guide.md`:

#### Contribution Duplication
Click the copy icon next to any contribution to duplicate it. The form will pre-fill with the original values.

#### Contribution Templates
Use the template selector at the top of the contribution form to quickly fill common contribution types.

#### Batch Approval (Stewards)
Select multiple contributions using checkboxes, then click "Approve Selected" to process them all at once.

#### Approval Notes
When approving contributions, add notes to maintain a clear audit trail. Use templates for common scenarios.

---

## Success Metrics

**Quantitative:**
- Contribution submission time reduced by 30%
- Approval processing time reduced by 50%
- Mobile usage increased by 20%
- Polling response perception improved (< 5s)

**Qualitative:**
- Member feedback: "Form is much faster now"
- Steward feedback: "Batch approval saves tons of time"
- Mobile feedback: "Actually usable on phone now"

---

## Next Steps

- Sprint 119: Multi-Period Support
- Sprint 120+: Additional enhancements from backlog
- Q2: Address high-priority bugs (contribution editing, password reset)

---

**Status:** COMPLETE — All 5 UX issues addressed with implementation specs, testing plan, and acceptance criteria.
