# Parenthesis Checklist for Grail Code

This checklist helps ensure all `perform:env:0` expressions and conditionals have proper parentheses.

> **Syntax update.** The examples and search patterns below predate commit
> `c2d60aad` (2026-04-06), which replaced literal
> `perform: #sel env: N withArguments: {…}` source syntax with the
> `@env0:`/`@env1:` send markers (e.g. `x perform: #> env: 0 withArguments:
> {y}` is now written `x @env0:> y`).  The parenthesization rules are
> unchanged — an `@envN:` send has the precedence of its underlying selector
> (unary / binary / keyword), so e.g. `(idx @env0:< 0) ifTrue: […]` still
> needs the parentheses.

## Quick Reference Rules

1. **`perform:env:0` before `ifTrue:`/`ifFalse:`**: Always wrap in parentheses
2. **Binary operators (`>`, `<`, `=`, `>=`, `<=`) in env: 1**: Use `perform:env:0` wrapped in parentheses
3. **Chained `perform:env:0`**: Wrap entire chain in parentheses before conditionals
4. **`==` vs `=`**: `==` is inlined (can use directly), `=` needs `perform:env:0`

## Systematic Search Patterns

### Pattern 1: `perform:env:0` before conditionals (MISSING PARENTHESES)

```bash
# Search for potential issues:
grep -n "perform:.*env: 0.*ifTrue:\|perform:.*env: 0.*ifFalse:" src/smalltalk/Python/*.gs
```

**What to look for:**
```smalltalk
❌ BAD: result perform: #isEmpty env: 0 ifTrue: [...]
✅ GOOD: (result perform: #isEmpty env: 0) ifTrue: [...]
```

### Pattern 2: Binary operators without `perform:env:0` (IN ENV: 1 CODE)

```bash
# Search for binary operators that might need perform:env:0:
grep -n "[^)] > \|[^)] < \|[^)] >= \|[^)] <=" src/smalltalk/Python/*.gs
```

**What to look for:**
```smalltalk
❌ BAD (in env: 1): sepIndex > lastDotIndex ifTrue: [...]
✅ GOOD: (sepIndex perform: #> env: 0 withArguments: {lastDotIndex}) ifTrue: [...]
```

### Pattern 3: Chained `perform:env:0` before conditionals

```bash
# Search for chained perform:env:0:
grep -n ") perform:.*env: 0.*ifTrue:\|) perform:.*env: 0.*ifFalse:" src/smalltalk/Python/*.gs
```

**What to look for:**
```smalltalk
❌ BAD: (result perform: #size env: 0) perform: #= env: 0 withArguments: {1} ifTrue: [...]
✅ GOOD: ((result perform: #size env: 0) perform: #= env: 0 withArguments: {1}) ifTrue: [...]
```

### Pattern 4: `==` vs `=` confusion

```bash
# Search for = comparisons that might need perform:env:0:
grep -n "perform: #=" src/smalltalk/Python/*.gs
```

**What to look for:**
```smalltalk
# == is inlined (identity comparison) - OK to use directly:
✅ GOOD: result == nil
✅ GOOD: isDir == false

# = needs perform:env:0 (equality comparison):
❌ BAD: result = nil  "In env: 1 code"
✅ GOOD: (result perform: #= env: 0 withArguments: {nil})
```

## Pre-Commit Checklist

Before committing code, verify:

- [ ] All temporary variables are declared at the beginning of the method/block scope
- [ ] All `perform:env:0` expressions before `ifTrue:`/`ifFalse:` are wrapped in parentheses
- [ ] All binary operators (`>`, `<`, `=`, `>=`, `<=`) in env: 1 code use `perform:env:0`
- [ ] All chained `perform:env:0` expressions are properly parenthesized
- [ ] `==` (identity) is used directly, `=` (equality) uses `perform:env:0`
- [ ] Code compiles without parse errors
- [ ] Tests pass

## Common Error Messages

### "expected a right brace (})"
- **Cause**: Missing closing brace in array literal or block
- **Check**: All `to:do:` blocks should end with `]}` not just `]`

### "Message not understood: ifTrue:ifTrue:"
- **Cause**: Chained `ifTrue:` messages without proper structure
- **Fix**: Restructure conditionals to avoid chaining

### "Message not understood: #method"
- **Cause**: Missing parentheses causing wrong message binding
- **Fix**: Wrap `perform:env:0` expression in parentheses

## Automated Checking Script

A fuller version of this script exists at `scripts/check_parentheses.sh`
(note: its grep paths still reference the pre-reorg `smalltalk/classes/`
layout — the sources now live under `src/smalltalk/`):

```bash
#!/bin/bash
# check_parentheses.sh

echo "Checking for perform:env:0 before conditionals without parentheses..."
grep -n "perform:.*env: 0.*ifTrue:\|perform:.*env: 0.*ifFalse:" src/smalltalk/Python/*.gs | \
  grep -v "^.*(.*perform:" && echo "⚠️  Found potential issues!"

echo ""
echo "Checking for binary operators that might need perform:env:0..."
grep -n "[^)] > \|[^)] < \|[^)] >= \|[^)] <=" src/smalltalk/Python/*.gs | \
  grep -v "== " && echo "⚠️  Found potential issues!"
```

## Examples from Fixed Code

### Example 1: Simple Conditional
```smalltalk
# Before (WRONG):
result perform: #isEmpty env: 0 ifTrue: [^ 'empty']

# After (CORRECT):
(result perform: #isEmpty env: 0) ifTrue: [^ 'empty']
```

### Example 2: Chained perform:env:0
```smalltalk
# Before (WRONG):
(result perform: #size env: 0) perform: #= env: 0 withArguments: {1} ifTrue: [^ 'one']

# After (CORRECT):
((result perform: #size env: 0) perform: #= env: 0 withArguments: {1}) ifTrue: [^ 'one']
```

### Example 3: Binary Operator
```smalltalk
# Before (WRONG in env: 1):
sepIndex > lastDotIndex ifTrue: [...]

# After (CORRECT):
(sepIndex perform: #> env: 0 withArguments: {lastDotIndex}) ifTrue: [...]
```

### Example 4: Nested Conditionals
```smalltalk
# Before (WRONG):
(result perform: #notEmpty env: 0) ifTrue: [
    (result perform: #last env: 0) perform: #= env: 0 withArguments: {'..'} ifFalse: [...]
] ifTrue: [...]

# After (CORRECT):
(result perform: #notEmpty env: 0) ifTrue: [
    ((result perform: #last env: 0) perform: #= env: 0 withArguments: {'..'}) ifFalse: [...]
] ifFalse: [...]
```

