# Smalltalk Message Precedence Guide

This guide explains Smalltalk message precedence rules and how to apply them correctly when writing Grail code.

## Message Types

Smalltalk has three types of messages, listed in order of precedence (highest to lowest):

1. **Unary messages** - No arguments, single word selector
2. **Binary messages** - One or two character operators
3. **Keyword messages** - One or more keywords ending with colons

## Precedence Order

Messages are evaluated in this order:
1. Unary messages (highest precedence)
2. Binary messages
3. Keyword messages (lowest precedence)

## Examples from Grail Codebase

### Unary Messages

Unary messages have the highest precedence and don't need parentheses:

```smalltalk
"✅ Good: Unary message, no parentheses needed"
^ self perform: #size env: 0

"✅ Good: Multiple unary messages chain naturally"
^ (result perform: #asSortedCollection env: 0) perform: #asArray env: 0
```

### Binary Messages

Binary messages have medium precedence:

```smalltalk
"✅ Good: Binary message in expression"
idx := size perform: #+ env: 0 withArguments: {idx}

"✅ Good: Binary comparison in condition"
(idx perform: #< env: 0 withArguments: {0}) ifTrue: [...]
```

### Keyword Messages

Keyword messages have the lowest precedence. When chaining keyword messages, you **must** use parentheses:

```smalltalk
"✅ Good: Single keyword message"
^ self perform: #at: env: 0 withArguments: {index}

"✅ Good: Keyword message with parentheses for clarity"
^ (x perform: #asFloat env: 0) perform: #sqrt env: 0

"❌ BAD: Chaining keyword messages without parentheses"
"This will NOT work as expected:"
result perform: #collect: env: 0 withArguments: {block} perform: #asArray env: 0

"✅ Good: Properly parenthesized keyword message chain"
(result perform: #collect: env: 0 withArguments: {block}) perform: #asArray env: 0
```

## Common Patterns

### Pattern 1: Unary after Keyword

```smalltalk
"❌ BAD: This sends perform:env:perform:env: as one message which is not understood"
^ anObject perform: #class env: 0 perform: #name env: 0

"✅ Good: Parentheses required when chaining keyword messages"
^ (anObject perform: #class env: 0) perform: #name env: 0

"✅ Also acceptable (more readable):"
| myClass |
myClass := anObject perform: #class env: 0.
^ myClass perform: #name env: 0
```

### Pattern 2: Binary in Condition

```smalltalk
"✅ Good: Binary comparison in condition"
(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
    idx := size perform: #+ env: 0 withArguments: {idx}
]

"✅ Good: Complex condition with parentheses"
((idx perform: #< env: 0 withArguments: {0}) or: [
    idx perform: #>= env: 0 withArguments: {size}
]) ifTrue: [
    IndexError perform: #signal: env: 0 withArguments: {'list index out of range'}
]
```

### Pattern 3: Chaining Keyword Messages

```smalltalk
"❌ BAD: Keyword messages chained without parentheses"
errorMsg := 'object of type ''' perform: #, env: 0 withArguments: {className} perform: #, env: 0 withArguments: {''' has no len()'}.

"✅ Good: Each keyword message on its own line with proper assignment"
errorMsg := 'object of type ''' perform: #, env: 0 withArguments: {className}.
errorMsg := errorMsg perform: #, env: 0 withArguments: {''' has no len()'}.

"✅ Also good: Using parentheses for clarity"
errorMsg := ('object of type ''' perform: #, env: 0 withArguments: {className}) perform: #, env: 0 withArguments: {''' has no len()'}.
```

### Pattern 4: Return Statements

```smalltalk
"✅ Good: Simple return with unary"
^ self perform: #size env: 0

"✅ Good: Return with keyword message"
^ anObject __repr__

"✅ Good: Return with parenthesized expression"
^ (x perform: #asFloat env: 0) perform: #sqrt env: 0

"✅ Good: Return with binary operation"
^ lnX perform: #/ env: 0 withArguments: {lnBase}
```

## Rules to Remember

1. **Unary messages bind tightest** - They don't need parentheses unless you want to change evaluation order.

2. **Binary messages bind before keyword messages** - But you may still need parentheses for clarity.

3. **Keyword messages bind last** - When chaining keyword messages, **always use parentheses** to group them correctly.

4. **When in doubt, use parentheses** - It's better to be explicit than to have subtle bugs.

5. **Break complex expressions into multiple lines** - This improves readability and reduces the need for parentheses.

## Anti-Patterns to Avoid

### ❌ Chaining Keyword Messages Without Parentheses

```smalltalk
"❌ BAD: This will not parse correctly"
result := collection perform: #collect: env: 0 withArguments: {block} perform: #select: env: 0 withArguments: {predicate} perform: #asArray env: 0

"✅ Good: Use parentheses or break into steps"
result := ((collection perform: #collect: env: 0 withArguments: {block}) perform: #select: env: 0 withArguments: {predicate}) perform: #asArray env: 0

"✅ Better: Break into clear steps"
| collected selected |
collected := collection perform: #collect: env: 0 withArguments: {block}.
selected := collected perform: #select: env: 0 withArguments: {predicate}.
result := selected perform: #asArray env: 0
```

### ❌ Unnecessary Parentheses on Unary Messages

```smalltalk
"❌ BAD: Unnecessary parentheses"
^ (self perform: #size env: 0)

"✅ Good: No parentheses needed"
^ self perform: #size env: 0
```

### ❌ Mixing Message Types Without Understanding Precedence

```smalltalk
"❌ BAD: Unclear precedence"
^ x perform: #asFloat env: 0 perform: #sqrt env: 0 perform: #* env: 0 withArguments: {2}

"✅ Good: Clear precedence with parentheses"
^ ((x perform: #asFloat env: 0) perform: #sqrt env: 0) perform: #* env: 0 withArguments: {2}

"✅ Better: Break into steps"
| xFloat sqrtResult |
xFloat := x perform: #asFloat env: 0.
sqrtResult := xFloat perform: #sqrt env: 0.
^ sqrtResult perform: #* env: 0 withArguments: {2}
```

## Real Examples from Grail

### Example 1: From `math.gs`

```smalltalk
"Good example: Unary message after keyword"
method: math
tau
	^ (Float perform: #pi env: 0) perform: #* env: 0 withArguments: {2}
%
```

### Example 2: From `builtins.gs`

```smalltalk
"Good example: Breaking complex expression into steps"
method: builtins
len: anObject
	| className errorMsg |
	[^ anObject __len__] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex |
		className := (anObject perform: #class env: 0) perform: #name env: 0.
		errorMsg := 'object of type ''' perform: #, env: 0 withArguments: {className}.
		errorMsg := errorMsg perform: #, env: 0 withArguments: {''' has no len()'}.
		TypeError perform: #signal: env: 0 withArguments: {errorMsg}
	]}
%
```

### Example 3: From `SequenceableCollection.gs`

```smalltalk
"Good example: Complex condition with proper parentheses"
method: SequenceableCollection
__getitem__: index
	| size idx |
	size := self perform: #size env: 0.
	idx := index.
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := size perform: #+ env: 0 withArguments: {idx}
	].
	((idx perform: #< env: 0 withArguments: {0}) or: [
		idx perform: #>= env: 0 withArguments: {size}
	]) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'list index out of range'}
	].
	^ self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}
%
```

## Critical Pattern: `perform:env:0` in Conditionals

**⚠️ IMPORTANT**: When using `perform:env:0` expressions in conditionals (`ifTrue:`, `ifFalse:`, `and:`, `or:`, etc.), you **MUST** wrap the entire `perform:env:0` expression in parentheses.

### ❌ Common Mistakes

```smalltalk
"❌ BAD: Missing parentheses - will cause precedence errors"
result perform: #isEmpty env: 0 ifTrue: [^ 'empty']

"❌ BAD: Missing parentheses on chained perform:"
(result perform: #size env: 0) perform: #= env: 0 withArguments: {1} ifTrue: [^ 'one']

"❌ BAD: Missing parentheses on binary operators"
sepIndex > lastDotIndex ifTrue: [...]  "In env: 2, this needs perform:env:0"
```

### ✅ Correct Patterns

```smalltalk
"✅ Good: Single perform:env:0 in conditional"
(result perform: #isEmpty env: 0) ifTrue: [^ 'empty']

"✅ Good: Chained perform:env:0 in conditional"
((result perform: #size env: 0) perform: #= env: 0 withArguments: {1}) ifTrue: [^ 'one']

"✅ Good: Binary operator with perform:env:0 in conditional"
(sepIndex perform: #> env: 0 withArguments: {lastDotIndex}) ifTrue: [...]

"✅ Good: Complex nested conditionals"
((result perform: #notEmpty env: 0) ifTrue: [
    ((result perform: #last env: 0) perform: #= env: 0 withArguments: {'..'}) ifFalse: [
        result perform: #removeLast env: 0
    ]
] ifFalse: [
    result perform: #add: env: 0 withArguments: {part}
])
```

### Rule: Always Parenthesize `perform:env:0` Before Conditionals

**When you see:**
- `perform:env:0` followed by `ifTrue:`, `ifFalse:`, `and:`, `or:`
- Binary operators (`>`, `<`, `=`, `>=`, `<=`) used in env: 2 code
- Chained `perform:env:0` expressions before conditionals

**Always wrap in parentheses:**
```smalltalk
(expression perform: #method env: 0 withArguments: {...}) ifTrue: [...]
```

## Systematic Checklist for Finding Parenthesis Issues

When reviewing code, check for these patterns:

### 1. Search for `perform:env:0` before conditionals
```bash
# Pattern to search for:
grep -n "perform:.*env: 0.*ifTrue:\|perform:.*env: 0.*ifFalse:" file.gs
```
**Fix**: Ensure the entire `perform:env:0` expression is in parentheses.

### 2. Search for binary operators in env: 2 code
```bash
# Pattern to search for:
grep -n "[^)] > \|[^)] < \|[^)] >= \|[^)] <=" file.gs
```
**Fix**: Use `perform: #> env: 0 withArguments: {...}` wrapped in parentheses.

### 3. Search for chained `perform:env:0` before conditionals
```bash
# Pattern to search for:
grep -n ") perform:.*env: 0.*ifTrue:\|) perform:.*env: 0.*ifFalse:" file.gs
```
**Fix**: Wrap the entire chain in parentheses: `((...) perform: #method env: 0) ifTrue: [...]`

### 4. Check for `==` vs `=` confusion
- `==` (identity) is inlined - can use directly: `result == nil`
- `=` (equality) needs `perform:env:0`: `(result perform: #= env: 0 withArguments: {value})`

## Summary

- **Unary messages**: Highest precedence, no parentheses needed
- **Binary messages**: Medium precedence, may need parentheses for clarity
- **Keyword messages**: Lowest precedence, **always use parentheses when chaining**
- **`perform:env:0` in conditionals**: **ALWAYS wrap in parentheses**
- **Binary operators in env: 2**: Use `perform:env:0` wrapped in parentheses
- **When in doubt**: Use parentheses or break into multiple statements
- **Readability**: Prefer clear, multi-line code over complex one-liners

Remember: The parser will enforce these rules, so incorrect precedence will cause compilation errors. When you see a parse error, check your message precedence first!

