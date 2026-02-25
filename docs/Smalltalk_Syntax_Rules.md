# Smalltalk Syntax Rules for Grail

This guide covers critical Smalltalk syntax rules that must be followed when writing Grail code. These rules are **mandatory** and violations will cause compilation errors.

## Rule 1: Temporary Variables Must Be Declared at the Top

### The Rule

**All temporary variables must be declared at the top of the method or block, before any code.** You cannot define variables after code has been executed.

### Syntax

Temporary variables are declared in a pipe-delimited list `| var1 var2 var3 |` immediately after the method signature and before any code.

### ✅ Correct Examples

#### Example 1: Simple Method

```smalltalk
category: 'Python-Attributes'
method: builtin_function_or_method
__repr__
	"Return a string representation of the function/method"

	| name result |
	name := self __name__.
	result := '<built-in function ' perform: #, env: 0 withArguments: {name}.
	result := result perform: #, env: 0 withArguments: {'>'}.
	^ result
%
```

**Key points:**
- `| name result |` is declared at the top, before any code
- All variables used in the method are declared here
- Variables are assigned later in the method body

#### Example 2: Complex Method with Multiple Variables

```smalltalk
category: 'Python-Attribute Access'
method: object
__dir__
	"Return list of valid attributes for this object."

	| selectors result myClass |
	myClass := self perform: #class env: 0.
	selectors := myClass perform: #allSelectorsForEnvironment: env: 0 withArguments: { 1 }.
	result := selectors perform: #collect: env: 0 withArguments: { [:selector |
		| index |
		index := selector perform: #indexOf: env: 0 withArguments: { $: }.
		index == 0
			ifTrue: [selector perform: #asString env: 0]
			ifFalse: [selector perform: #copyFrom:to: env: 0 withArguments: { 1. (index perform: #- env: 0 withArguments: {1}) }]
	] }.
	^ (result perform: #asSortedCollection env: 0) perform: #asArray env: 0
%
```

**Key points:**
- Method variables: `| selectors result myClass |` at the top
- Block variables: `| index |` inside the block, at the top of the block
- All variables declared before any code

#### Example 3: Block with Temporary Variables

```smalltalk
category: 'Message Handling'
method: object
with: anObject perform: aSelectorSymbol env: environmentId
	"Sends the receiver the message indicated by the arguments."

	| sel |
	sel := aSelectorSymbol asSymbol.
	^self _perform: sel env: environmentId withArguments: { anObject }
%
```

**Key points:**
- Block variable `| sel |` is declared at the top of the method
- Even if only used later, it must be declared first

### ❌ Incorrect Examples

#### ❌ BAD: Variable Declared After Code

```smalltalk
method: MyClass
myMethod
	"❌ WRONG: Variable declared after code"
	
	result := 5.
	| result |  "❌ ERROR: Can't declare variables after code"
	^ result
%
```

**Error:** This will cause a compilation error. Variables must be declared before any code.

#### ❌ BAD: Variable Declared in Middle of Method

```smalltalk
method: MyClass
myMethod
	"❌ WRONG: Variable declared in middle"
	
	| firstVar |
	firstVar := 10.
	| secondVar |  "❌ ERROR: Can't declare variables here"
	secondVar := 20.
	^ firstVar + secondVar
%
```

**Error:** All variables must be declared together at the top.

#### ✅ GOOD: All Variables at Top

```smalltalk
method: MyClass
myMethod
	"✅ CORRECT: All variables declared at top"
	
	| firstVar secondVar |
	firstVar := 10.
	secondVar := 20.
	^ firstVar + secondVar
%
```

### Block Variables

Temporary variables in blocks must also be declared at the top of the block:

```smalltalk
method: MyClass
processCollection: aCollection
	| result |
	result := aCollection collect: [:each |
		| processed |  "✅ Block variable declared at top of block"
		processed := each perform: #transform env: 0.
		^ processed
	].
	^ result
%
```

## Rule 2: Keyword Messages Must Have Exactly the Right Number of Arguments

### The Rule

**Every keyword message must receive exactly the right number of arguments.** The number of arguments must match the number of keywords in the selector.

### Keyword Message Syntax

A keyword message has the form:
```
receiver keyword1: arg1 keyword2: arg2 keyword3: arg3
```

Each keyword must have exactly one argument following it.

### ✅ Correct Examples

#### Example 1: Single Keyword

```smalltalk
category: 'Python-Attributes'
method: builtin_function_or_method
__self__
	"Return the object the method is bound to"
	AttributeError perform: #signal: env: 0 withArguments: {'__self__'}
%
```

**Key points:**
- `signal:` is a single-keyword message requiring 1 argument
- `withArguments:` is a single-keyword message requiring 1 argument
- Each keyword has exactly one argument

#### Example 2: Multiple Keywords

```smalltalk
category: 'Python-Initialization'
classmethod: complex
__new__: r _: i
	"Create a new complex number with given real and imaginary parts."

	| realVal imagVal |
	realVal := r ifNil: [0.0] ifNotNil: [r].
	imagVal := i ifNil: [0.0] ifNotNil: [i].
	^ self perform: #___real:imaginary: env: 0 withArguments: {realVal. imagVal}
%
```

**Key points:**
- `___real:imaginary:` is a two-keyword message requiring 2 arguments
- `withArguments:` receives an array with 2 elements: `{realVal. imagVal}`
- Each keyword has exactly one argument

#### Example 3: Nested Keyword Messages

```smalltalk
category: 'Python-Initialization'
classmethod: Decimal
__new__: cls _: value
	| valueClass |
	valueClass := value perform: #class env: 0.
	(value perform: #isKindOf: env: 0 withArguments: {String}) ifTrue: [
		^ Decimal perform: #_fromString:decimalPoint: env: 0 withArguments: {value. nil}
	].
	^ Decimal perform: #for:scale: env: 0 withArguments: {value. 28}
%
```

**Key points:**
- `isKindOf:` requires 1 argument: `{String}`
- `_fromString:decimalPoint:` requires 2 arguments: `{value. nil}`
- `for:scale:` requires 2 arguments: `{value. 28}`

### ❌ Incorrect Examples

#### ❌ BAD: Missing Argument

```smalltalk
method: MyClass
badMethod
	"❌ WRONG: Missing argument for keyword message"
	
	obj perform: #signal: env: 0.  "❌ ERROR: signal: requires 1 argument"
%
```

**Error:** `signal:` requires 1 argument, but none is provided.

#### ❌ BAD: Too Many Arguments

```smalltalk
method: MyClass
badMethod
	"❌ WRONG: Too many arguments"
	
	obj perform: #signal: env: 0 withArguments: {'error1'. 'error2'}.  "❌ ERROR: signal: only takes 1 argument"
%
```

**Error:** `signal:` only accepts 1 argument, but 2 are provided.

#### ❌ BAD: Wrong Number of Arguments in Array

```smalltalk
method: MyClass
badMethod
	"❌ WRONG: Array has wrong number of elements"
	
	obj perform: #___real:imaginary: env: 0 withArguments: {realVal}.  "❌ ERROR: Needs 2 arguments, got 1"
%
```

**Error:** `___real:imaginary:` requires 2 arguments, but the array only has 1 element.

#### ✅ GOOD: Correct Number of Arguments

```smalltalk
method: MyClass
goodMethod
	"✅ CORRECT: Exactly the right number of arguments"
	
	obj perform: #___real:imaginary: env: 0 withArguments: {realVal. imagVal}.  "✅ 2 arguments for 2 keywords"
%
```

## Rule 3: Parentheses Are Essential for Correct Parsing

### The Rule

**Parentheses are essential to ensure the parser groups expressions correctly.** Without parentheses, the parser may group messages incorrectly, leading to errors or unexpected behavior.

### Message Precedence

Smalltalk evaluates messages in this order:
1. Unary messages (highest precedence)
2. Binary messages
3. Keyword messages (lowest precedence)

Parentheses override this precedence.

### ✅ Correct Examples

#### Example 1: Chaining Keyword Messages

```smalltalk
category: 'Python-Attributes'
method: builtin_function_or_method
__repr__
	| name result |
	name := self __name__.
	result := '<built-in function ' perform: #, env: 0 withArguments: {name}.
	result := (result perform: #, env: 0 withArguments: {'>'}).  "✅ Parentheses for clarity"
	^ result
%
```

**Key points:**
- Parentheses group the `perform:env:withArguments:` message
- This ensures the result is assigned correctly

#### Example 2: Complex Expression

```smalltalk
category: 'Python-Sequence Protocol'
method: SequenceableCollection
__getitem__: index
	| size idx |
	size := self perform: #size env: 0.
	idx := index.
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [  "✅ Parentheses group the comparison"
		idx := size perform: #+ env: 0 withArguments: {idx}
	].
	((idx perform: #< env: 0 withArguments: {0}) or: [  "✅ Parentheses group the condition"
		idx perform: #>= env: 0 withArguments: {size}
	]) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'list index out of range'}
	].
	^ self perform: #at: env: 0 withArguments: {(idx perform: #+ env: 0 withArguments: {1})}  "✅ Parentheses group the addition"
%
```

**Key points:**
- Parentheses group the comparison: `(idx perform: #< ...)`
- Parentheses group the compound condition: `((idx perform: #< ...) or: [...])`
- Parentheses group the addition: `(idx perform: #+ ...)`

#### Example 3: Nested Messages

```smalltalk
category: 'Python-String Representation'
method: Decimal
__repr__
	| strVal |
	strVal := self perform: #asString env: 0.
	^ 'Decimal(''' perform: #, env: 0 withArguments: {
		(strVal perform: #, env: 0 withArguments: {''''})  "✅ Parentheses group the concatenation"
	}
%
```

**Key points:**
- Parentheses group the inner message before it's used as an argument
- Without parentheses, the parser would try to send `,` to the result incorrectly

### ❌ Incorrect Examples

#### ❌ BAD: Missing Parentheses on Keyword Chain

```smalltalk
method: MyClass
badMethod
	"❌ WRONG: Missing parentheses"
	
	result := collection perform: #collect: env: 0 withArguments: {block} perform: #asArray env: 0.
	"❌ ERROR: Parser doesn't know how to group this"
%
```

**Error:** The parser doesn't know whether `perform: #asArray env: 0` should be sent to the result of `collect:` or to something else.

#### ✅ GOOD: Parentheses Group Correctly

```smalltalk
method: MyClass
goodMethod
	"✅ CORRECT: Parentheses group the chain"
	
	result := (collection perform: #collect: env: 0 withArguments: {block}) perform: #asArray env: 0.
	"✅ Clear: collect: is grouped, then asArray is sent to the result"
%
```

#### ❌ BAD: Missing Parentheses in Condition

```smalltalk
method: MyClass
badMethod
	"❌ WRONG: Missing parentheses"
	
	idx perform: #< env: 0 withArguments: {0} ifTrue: [  "❌ ERROR: ifTrue: is being sent to the wrong receiver"
		"do something"
	]
%
```

**Error:** Without parentheses, `ifTrue:` is being sent to the result of `perform:env:withArguments:`, which may not be a boolean.

#### ✅ GOOD: Parentheses Group Condition

```smalltalk
method: MyClass
goodMethod
	"✅ CORRECT: Parentheses group the condition"
	
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [  "✅ ifTrue: is sent to the boolean result"
		"do something"
	]
%
```

#### ❌ BAD: Missing Parentheses in Arithmetic

```smalltalk
method: MyClass
badMethod
	"❌ WRONG: Missing parentheses"
	
	result := size perform: #+ env: 0 withArguments: {idx} perform: #+ env: 0 withArguments: {1}.
	"❌ ERROR: Ambiguous grouping"
%
```

**Error:** The parser doesn't know how to group the two `+` operations.

#### ✅ GOOD: Parentheses Group Arithmetic

```smalltalk
method: MyClass
goodMethod
	"✅ CORRECT: Parentheses group the operations"
	
	result := (size perform: #+ env: 0 withArguments: {idx}) perform: #+ env: 0 withArguments: {1}.
	"✅ Clear: First addition is grouped, then second addition"
%
```

## Common Patterns

### Pattern 1: Method with Multiple Variables

```smalltalk
method: MyClass
myMethod: arg1 _: arg2
	| var1 var2 var3 result |
	var1 := arg1 perform: #transform env: 0.
	var2 := arg2 perform: #transform env: 0.
	var3 := var1 perform: #+ env: 0 withArguments: {var2}.
	result := var3 perform: #process env: 0.
	^ result
%
```

**Key points:**
- All variables declared at top: `| var1 var2 var3 result |`
- Variables assigned later
- All keyword messages have correct number of arguments

### Pattern 2: Conditional with Parentheses

```smalltalk
method: MyClass
checkCondition: value
	| result |
	((value perform: #< env: 0 withArguments: {0}) or: [
		value perform: #> env: 0 withArguments: {100}
	]) ifTrue: [
		result := 'out of range'
	] ifFalse: [
		result := 'in range'
	].
	^ result
%
```

**Key points:**
- Parentheses group the compound condition
- All variables declared at top
- Correct number of arguments for all messages

### Pattern 3: Error Handling

```smalltalk
method: MyClass
safeOperation: obj
	| result |
	[result := obj perform: #operation env: 1] perform: #on:do: env: 0 withArguments: {
		MessageNotUnderstood.
		[:ex | TypeError perform: #signal: env: 0 withArguments: {'operation not supported'}]
	}.
	^ result
%
```

**Key points:**
- Block variable `ex` declared at top of block
- `on:do:` receives exactly 2 arguments
- Parentheses group the block properly

## Quick Reference

### Variable Declaration Checklist

- [ ] All temporary variables declared at the top of the method
- [ ] All block variables declared at the top of the block
- [ ] No variables declared after code
- [ ] Variables declared before first use

### Keyword Message Checklist

- [ ] Each keyword has exactly one argument
- [ ] Number of arguments matches number of keywords
- [ ] Array arguments have correct number of elements
- [ ] No missing arguments
- [ ] No extra arguments

### Parentheses Checklist

- [ ] Parentheses used when chaining keyword messages
- [ ] Parentheses used in compound conditions
- [ ] Parentheses used in arithmetic expressions
- [ ] Parentheses used when message result is used as argument
- [ ] Parentheses used when precedence is unclear

## Summary

1. **Variables at Top**: All temporary variables must be declared at the top of methods/blocks
2. **Exact Argument Count**: Every keyword message must receive exactly the right number of arguments
3. **Use Parentheses**: Parentheses are essential for correct parsing, especially when:
   - Chaining keyword messages
   - Creating compound conditions
   - Grouping arithmetic operations
   - Using message results as arguments

**Remember:** These are not optional guidelines—they are mandatory syntax rules. Violations will cause compilation errors!

