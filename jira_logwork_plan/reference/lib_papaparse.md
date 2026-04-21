# PapaParse Reference

## Core Config
```javascript
Papa.parse(file, {
    header: true,         // Treat first row as headers
    skipEmptyLines: true, 
    dynamicTyping: true,  // Automatically convert numbers
    complete: (results) => {
        // results.data: array of objects
        // results.meta.fields: array of headers
    }
});
```

## Delimiter Detection
PapaParse can auto-detect delimiters (`,` vs `;` vs `\t`).
```javascript
const result = Papa.parse(csvString, { preview: 1 });
const delimiter = result.meta.delimiter;
```

## Large Files
Use `worker: true` for large files to prevent UI lock.
```javascript
Papa.parse(file, {
    worker: true,
    step: (results) => {
        // Handle row by row
    }
});
```
