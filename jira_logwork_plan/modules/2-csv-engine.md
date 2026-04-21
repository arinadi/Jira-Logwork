# Module 2: CSV Data Engine

- **Estimated Complexity**: S (~4 files)
- **Estimated Files**: `src/components/Uploader.tsx`, `src/utils/csvParser.ts`, `src/hooks/useCSV.ts`
- **Key Risks**: Delimiter detection failure, large file performance.

## Requirements
Parse CSV files and map columns to Jira worklog fields.

## UI Structure
- **DropZone**: Large interactive area with drag-and-drop.
- **MappingDialog**: Appears if auto-detection fails, allowing user to pick columns for `Issue Key`, `Date`, `Duration`, `Comment`.

## Technical Implementation
- Use PapaParse for parsing.
- Implement auto-mapping logic that looks for common headers (e.g., "Hours", "Time Spent", "Working time (h)").
- Validate CSV structure before passing to the next module.

## Testing
- [ ] Dropping a CSV triggers parsing.
- [ ] Column auto-detection works for "issue id", "date", "working time (h)", "comment".
- [ ] Error message displayed when file is invalid.
