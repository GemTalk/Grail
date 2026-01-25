# Testing Guide for Grail

This guide explains how to write tests for Grail, following the established patterns and best practices.

## Overview

**Writing tests is equally important as writing the primary code.** Every feature implementation should be accompanied by comprehensive tests that verify:
- Correct behavior for normal cases
- Error handling for edge cases
- Compatibility with CPython behavior

## Test Structure

### Test Class Organization

Tests are organized in `smalltalk/tests/` with the following structure:

1. **Test class definitions** are in `smalltalk/tests/_PythonTests.gs`
2. **Test method implementations** are in separate files (e.g., `smalltalk/tests/BuiltinsTestCase.gs`)
3. **Exception tests** are in `smalltalk/tests/exceptions/` subdirectory
4. All test classes inherit from `PythonTestCase` (which inherits from `TestCase`)

### Test Class Naming

- Test classes are named `{ClassName}TestCase`
- Examples: `BuiltinsTestCase`, `ListTestCase`, `MathTestCase`, `TypeErrorTestCase`
- Exception test classes: `{ExceptionName}TestCase` (e.g., `TypeErrorTestCase`, `ValueErrorTestCase`)

### Test Method Naming

- Test methods are named `test{FeatureName}` (camelCase)
- Examples: `testAbs`, `testLen`, `test__getitem__`, `testLenTypeError`
- Use descriptive names that indicate what is being tested

## Test File Template

Every test file follows this structure:

```smalltalk
! ===============================================================================
! {ClassName}TestCase - Tests for Python {module/type}
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
{ClassName}TestCase removeAllMethods: 0.
{ClassName}TestCase class removeAllMethods: 0.
%

! ------------------- Test methods for {ClassName}TestCase

category: 'Tests - {Category Name}'
method: {ClassName}TestCase
test{FeatureName}
	"Test {description of what is being tested}"

	| variable1 variable2 result |
	"Setup code here"
	
	"Test code here"
	result := object perform: #methodName: env: 2 withArguments: {arg}.
	
	"Assertions here"
	self assert: result equals: expectedValue
%
```

## Writing Test Methods

### Basic Test Structure

```smalltalk
category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testAbs
	"Test abs() function"

	| result |
	result := builtins perform: #abs: env: 2 withArguments: {5}.
	self assert: result equals: 5.

	result := builtins perform: #abs: env: 2 withArguments: {-5}.
	self assert: result equals: 5.

	result := builtins perform: #abs: env: 2 withArguments: {0}.
	self assert: result equals: 0
%
```

### Key Points:

1. **Declare all temporary variables at the top** - Smalltalk requires this
2. **Use `env: 2` for Python methods** - This ensures methods are called in the Python environment
3. **Use direct Smalltalk messages for basic operations** - e.g., `obj at: 1` instead of `obj perform: #at: env: 0 withArguments: {1}`
4. **Use descriptive comments** - Explain what the test verifies

### Testing Multiple Cases

```smalltalk
category: 'Tests - Sequence Protocol'
method: ListTestCase
test__getitem__
	"Test list.__getitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {0}) equals: 10.
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {2}) equals: 30.
	
	"Negative indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {-1}) equals: 50.
	
	"Out of bounds"
	self should: [lst perform: #__getitem__: env: 2 withArguments: {5}] raise: IndexError
%
```

### Testing Exceptions

Use `should:raise:` to test that exceptions are raised correctly:

```smalltalk
category: 'Tests - Type Functions'
method: BuiltinsTestCase
testLenTypeError
	"Test that len() raises TypeError for objects without __len__"

	self should: [
		builtins perform: #len: env: 2 withArguments: {42}
	] raise: TypeError
%
```

### Testing Floating Point Values

For floating point comparisons, use approximate equality:

```smalltalk
category: 'Tests - Power and Logarithmic'
method: MathTestCase
testSqrt
	"Test math.sqrt()"

	| result |
	result := (math perform: #sqrt: env: 2 withArguments: {2}).
	self assert: ((result - 1.41421) abs < 0.001)
%
```

### Testing Constants

```smalltalk
category: 'Tests - Constants'
method: MathTestCase
testPi
	"Test math.pi constant"

	| result |
	result := math perform: #pi env: 2.

	self assert: ((result - 3.14159) abs < 0.001)
%
```

### Testing Object Creation

```smalltalk
category: 'Python-Attribute Access'
method: ObjectTestCase
test__class__
	"Test that __class__ returns the class of the object"

	| obj result |
	obj := object perform: #__new__ env: 2.
	result := obj perform: #__class__ env: 2.
	self assert: result equals: object
%
```

### Testing Mutating Operations

```smalltalk
category: 'Tests - List Methods'
method: ListTestCase
testAppend
	"Test list.append(item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).

	lst perform: #append: env: 2 withArguments: {4}.

	self assert: lst size equals: 4.
	self assert: (lst at: 4) equals: 4
%
```

### Testing Comparisons

```smalltalk
category: 'Tests - Comparison'
method: ListTestCase
test__eq__
	"Test list.__eq__(other)"

	| lst1 lst2 lst3 |
	lst1 := OrderedCollection withAll: #(1 2 3).
	lst2 := OrderedCollection withAll: #(1 2 3).
	lst3 := OrderedCollection withAll: #(1 2 4).
	
	"Same contents"
	self assert: (lst1 perform: #__eq__: env: 2 withArguments: {lst2}).
	
	"Different contents"
	self deny: (lst1 perform: #__eq__: env: 2 withArguments: {lst3})
%
```

## Assertion Methods

Grail tests use SUnit assertion methods:

### `assert:equals:`
Tests that two values are equal:
```smalltalk
self assert: result equals: 5
```

### `assert:`
Tests that a boolean is true:
```smalltalk
self assert: (result includes: '__class__')
```

### `deny:`
Tests that a boolean is false:
```smalltalk
self deny: (lst1 perform: #__eq__: env: 2 withArguments: {lst3})
```

### `should:raise:`
Tests that a block raises a specific exception:
```smalltalk
self should: [
	lst perform: #__getitem__: env: 2 withArguments: {5}
] raise: IndexError
```

## Environment IDs

Understanding environment IDs is crucial:

- **`env: 2`** - Python environment (Python methods)
  - Use for: Calling Python methods, Python protocol methods
  - Example: `obj perform: #__len__ env: 2`

- **Direct Smalltalk messages** - For basic Smalltalk operations
  - Use for: Creating objects, basic operations, type checks
  - Example: `obj at: 1` instead of `obj perform: #at: env: 0 withArguments: {1}`
  - Example: `list add: item` instead of `list perform: #add: env: 0 withArguments: {item}`

## Test Categories

Organize tests into logical categories:

- `'Tests - Numeric Functions'`
- `'Tests - Type Functions'`
- `'Tests - Sequence Protocol'`
- `'Tests - List Methods'`
- `'Tests - Constants'`
- `'Tests - Power and Logarithmic'`
- `'Tests - Comparison'`
- `'Python-Attribute Access'`
- `'Python-Tests-{ExceptionName}'` (for exception tests)

## Creating New Test Classes

### Step 1: Add Class Definition to `_PythonTests.gs`

```smalltalk
! ------------------- Class definition for {ClassName}TestCase
expectvalue /Class
doit
PythonTestCase subclass: '{ClassName}TestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%
expectvalue /Class
doit
{ClassName}TestCase category: 'SUnit'
%
```

### Step 2: Create Test File

Create `smalltalk/tests/{ClassName}TestCase.gs` with the template structure.

### Step 3: Load Test File in `_PythonTests.gs`

Add at the end of `_PythonTests.gs`:
```smalltalk
input smalltalk/tests/{ClassName}TestCase.gs
```

## Best Practices

### 1. Test Normal Cases First

Start with the happy path:
```smalltalk
testAbs
	| result |
	result := builtins perform: #abs: env: 2 withArguments: {5}.
	self assert: result equals: 5
%
```

### 2. Test Edge Cases

Include boundary conditions:
```smalltalk
testAbs
	| result |
	result := builtins perform: #abs: env: 2 withArguments: {0}.
	self assert: result equals: 0.

	result := builtins perform: #abs: env: 2 withArguments: {-3.14}.
	self assert: ((result - 3.14) abs < 0.0001)
%
```

### 3. Test Error Cases

Verify exceptions are raised correctly:
```smalltalk
testLenTypeError
	self should: [
		builtins perform: #len: env: 2 withArguments: {42}
	] raise: TypeError
%
```

### 4. Test Multiple Scenarios

Cover different input types and conditions:
```smalltalk
test__getitem__
	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {0}) equals: 10.
	
	"Negative indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {-1}) equals: 50.
	
	"Out of bounds"
	self should: [lst perform: #__getitem__: env: 2 withArguments: {5}] raise: IndexError
%
```

### 5. Use Descriptive Names

Test method names should clearly indicate what is being tested:
- ✅ `testAbs` - clear and concise
- ✅ `testLenTypeError` - indicates it tests error case
- ✅ `test__getitem__` - tests specific Python method
- ❌ `test1` - not descriptive
- ❌ `testStuff` - too vague

### 6. Group Related Tests

Use categories to organize related tests:
```smalltalk
category: 'Tests - Sequence Protocol'
method: ListTestCase
test__len__
	...
%

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__getitem__
	...
%
```

### 7. Compare with CPython

When possible, verify behavior matches CPython:
- Run the same test in CPython
- Compare outputs
- Document any intentional differences

## Running Tests

Tests are run using the SUnit framework:

```bash
. ./setenv
topaz -lq <<EOF
login
run
PythonTestCase suite run printString
%
logout
EOF
```

Or run a specific test class:
```smalltalk
BuiltinsTestCase suite run printString
```

## Example: Complete Test File

Here's a complete example from `ListTestCase.gs`:

```smalltalk
! ===============================================================================
! ListTestCase - Tests for Python list (OrderedCollection)
! ===============================================================================

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
ListTestCase removeAllMethods: 0.
ListTestCase class removeAllMethods: 0.
%

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__len__
	"Test list.__len__()"

	| lst |
	lst := OrderedCollection new.
	self assert: (lst perform: #__len__ env: 2) equals: 0.
	
	lst add: 1; add: 2; add: 3.
	self assert: (lst perform: #__len__ env: 2) equals: 3
%

category: 'Tests - Sequence Protocol'
method: ListTestCase
test__getitem__
	"Test list.__getitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {0}) equals: 10.
	
	"Negative indices"
	self assert: (lst perform: #__getitem__: env: 2 withArguments: {-1}) equals: 50.
	
	"Out of bounds"
	self should: [lst perform: #__getitem__: env: 2 withArguments: {5}] raise: IndexError
%
```

## Checklist for New Features

When implementing a new feature, ensure you:

- [ ] Create test class if it doesn't exist
- [ ] Write tests for normal cases
- [ ] Write tests for edge cases (boundary conditions)
- [ ] Write tests for error cases (exceptions)
- [ ] Test with different input types
- [ ] Verify behavior matches CPython (when applicable)
- [ ] Use appropriate categories
- [ ] Use descriptive test method names
- [ ] Declare all temporary variables at the top
- [ ] Use `env: 2` for Python methods, direct Smalltalk messages for basic operations
- [ ] Run tests and ensure they pass

## Common Patterns

### Pattern 1: Testing Built-in Functions

```smalltalk
category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
test{FunctionName}
	| result |
	result := builtins perform: #{functionName}: env: 2 withArguments: {arg}.
	self assert: result equals: expectedValue
%
```

### Pattern 2: Testing Type Methods

```smalltalk
category: 'Tests - Sequence Protocol'
method: ListTestCase
test{MethodName}
	| lst result |
	lst := OrderedCollection withAll: #(1 2 3).
	result := lst perform: #{methodName}: env: 2 withArguments: {args}.
	self assert: result equals: expectedValue
%
```

### Pattern 3: Testing Exceptions

```smalltalk
category: 'Python-Tests-{ExceptionName}'
method: {ExceptionName}TestCase
test_inheritance
	| exc |
	exc := {ExceptionName} perform: #__new__: env: 2 withArguments: { {ExceptionName} }.
	self assert: (exc isKindOf: Exception)
%

category: 'Python-Tests-{ExceptionName}'
method: {ExceptionName}TestCase
test_creation
	| exc |
	exc := {ExceptionName} perform: #__new__: env: 2 withArguments: { {ExceptionName} }.
	self assert: exc notNil
%
```

## Summary

- **Tests are essential** - Write tests alongside implementation
- **Follow the structure** - Use the established patterns
- **Test comprehensively** - Normal cases, edge cases, error cases
- **Use `env: 2` for Python methods** - Direct Smalltalk messages for basic operations
- **Be descriptive** - Clear test names and comments
- **Organize logically** - Use categories to group related tests
- **Verify CPython compatibility** - When possible, compare with CPython behavior

Remember: **Writing tests is equally important as writing the primary code!**

