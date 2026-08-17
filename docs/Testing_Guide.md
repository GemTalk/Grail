# Testing Guide for Grail

This guide explains how to write tests for Grail, following the established patterns and best practices.

## Overview

**Writing tests is equally important as writing the primary code.** Every feature implementation should be accompanied by comprehensive tests that verify:
- Correct behavior for normal cases
- Error handling for edge cases
- Compatibility with CPython behavior

## Test Structure

### Test Class Organization

Tests are organized in `src/smalltalk/PythonTests/` with the following structure:

1. **Each test class lives in its own file** (e.g., `src/smalltalk/PythonTests/BuiltinsTestCase.gs`) containing the class definition followed by the test methods
2. **Test files are loaded via `input` lines** in `src/smalltalk/install.gs`
3. **Exception tests** follow the same pattern in the same directory (e.g., `src/smalltalk/PythonTests/TypeErrorTestCase.gs`)
4. All test classes inherit from `PythonTestCase` (which inherits from `TestCase`; see `src/smalltalk/PythonTests/PythonTestCase.gs`)

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
! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

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
{ClassName}TestCase category: 'Grail-SUnit'
%

! ===============================================================================
! {ClassName}TestCase - Tests for Python {module/type}
! ===============================================================================

set compile_env: 0

! ------------------- Remove existing test methods
expectvalue /Metaclass3
doit
{ClassName}TestCase removeAllMethods.
{ClassName}TestCase class removeAllMethods.
%

set compile_env: 0

! ------------------- Test methods for {ClassName}TestCase

category: 'Grail-Tests - {Category Name}'
method: {ClassName}TestCase
test{FeatureName}
	"Test {description of what is being tested}"

	| variable1 variable2 result |
	"Setup code here"
	
	"Test code here"
	result := object @env1:methodName: arg.
	
	"Assertions here"
	self assert: result equals: expectedValue
%
```

## Writing Test Methods

### Basic Test Structure

```smalltalk
category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
testAbs
	"Test abs() function"

	| b result |
	b := builtins ___instance___.

	result := b @env1:abs: 5.
	self assert: result equals: 5.

	result := b @env1:abs: -5.
	self assert: result equals: 5.

	result := b @env1:abs: 0.
	self assert: result equals: 0
%
```

### Key Points:

1. **Declare all temporary variables at the top** - Smalltalk requires this
2. **Use `@env1:` sends for Python methods** - The `@env1:` marker forces the send into environment 1, where the Python protocol lives (e.g., `lst @env1:append: 4`)
3. **Use direct Smalltalk messages for basic operations** - e.g., `obj at: 1` or `lst size` for setup and plumbing
4. **Use descriptive comments** - Explain what the test verifies

### Testing Multiple Cases

```smalltalk
category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__getitem__
	"Test list.__getitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (lst @env1:__getitem__: 0) equals: 10.
	self assert: (lst @env1:__getitem__: 2) equals: 30.
	
	"Negative indices"
	self assert: (lst @env1:__getitem__: -1) equals: 50.
	
	"Out of bounds"
	self should: [lst @env1:__getitem__: 5] raise: IndexError
%
```

### Testing Exceptions

Use `should:raise:` to test that exceptions are raised correctly:

```smalltalk
category: 'Grail-Tests - Type Functions'
method: BuiltinsTestCase
testLenTypeError
	"Test that len() raises TypeError for objects without __len__"

	self should: [
		builtins ___instance___ @env1:len: 42
	] raise: TypeError
%
```

### Testing Floating Point Values

For floating point comparisons, use approximate equality:

```smalltalk
category: 'Grail-Tests - Power and Logarithmic'
method: MathTestCase
testSqrt
	"Test math.sqrt()"

	| m result |
	m := math @env1:instance.

	result := m @env1:sqrt: 4.
	self assert: result equals: 2.0
%
```

### Testing Constants

```smalltalk
category: 'Grail-Tests - Constants'
method: MathTestCase
testPi
	"Test math.pi constant"

	| m result |
	m := math @env1:instance.
	result := m @env1:pi.

	self assert: ((result - 3.14159) abs < 0.001)
%
```

### Testing Object Creation

```smalltalk
category: 'Grail-Tests - Type'
method: BytearrayTestCase
test__class__
	"Test that type(bytearray()) returns bytearray"

	| result cls |
	result := bytearray @env1:__new__.
	cls := result @env1:__class__.

	self assert: cls equals: (Python at: #'bytearray')
%
```

### Testing Mutating Operations

```smalltalk
category: 'Grail-Tests - List Methods'
method: ListTestCase
testAppend
	"Test list.append(item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).

	lst @env1:append: 4.

	self assert: lst size equals: 4.
	self assert: (lst at: 4) equals: 4
%
```

### Testing Comparisons

```smalltalk
category: 'Grail-Tests - Comparison'
method: ListTestCase
test__eq__
	"Test list.__eq__(other)"

	| lst1 lst2 lst3 |
	lst1 := OrderedCollection withAll: #(1 2 3).
	lst2 := OrderedCollection withAll: #(1 2 3).
	lst3 := OrderedCollection withAll: #(1 2 4).
	
	"Same contents"
	self assert: (lst1 @env1:__eq__: lst2).
	
	"Different contents"
	self deny: (lst1 @env1:__eq__: lst3)
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
self deny: (lst1 @env1:__eq__: lst3)
```

### `should:raise:`
Tests that a block raises a specific exception:
```smalltalk
self should: [
	lst @env1:__getitem__: 5
] raise: IndexError
```

## Environment IDs

Understanding environment IDs is crucial:

- **`@env1:` sends** - Python environment (Python methods)
  - Use for: Calling Python methods, Python protocol methods
  - Example: `obj @env1:__len__`, `lst @env1:__getitem__: 0`
  - The equivalent `perform:env:` form (`obj perform: #__len__ env: 1`) still works but the `@env1:` syntax is the established style

- **Direct Smalltalk messages** - For basic Smalltalk operations
  - Use for: Creating objects, basic operations, type checks
  - Example: `obj at: 1`, `list add: item`, `lst size`

## Test Categories

Organize tests into logical categories (all prefixed `Grail-`):

- `'Grail-Tests - Numeric Functions'`
- `'Grail-Tests - Type Functions'`
- `'Grail-Tests - Sequence Protocol'`
- `'Grail-Tests - List Methods'`
- `'Grail-Tests - Constants'`
- `'Grail-Tests - Power and Logarithmic'`
- `'Grail-Tests - Comparison'`
- `'Grail-Tests-{ExceptionName}'` (for exception tests)

## Creating New Test Classes

### Step 1: Create Test File

Create `src/smalltalk/PythonTests/{ClassName}TestCase.gs` with the template
structure above — the file starts with the superclass check and the class
definition, followed by the test methods.

### Step 2: Register the Test File in `src/smalltalk/install.gs`

Add an `input` line alongside the other test files:
```smalltalk
input src/smalltalk/PythonTests/{ClassName}TestCase.gs
```

### Step 3: Re-run the Install

Run `./install.sh` so the new class is compiled into the image.

## Python fixtures in `tests/python/`, and the CPython gate

A fixture in `tests/python/` states **what CPython does**; the Smalltalk test
case then asserts Grail agrees. That only works if the fixture was measured
against CPython. A fixture written from a Grail session instead pins Grail's
*current* behaviour — bug and all — and from then on reads as conformance
evidence. This has happened four times: `exec_class_definition.py`,
`exception_naming.py`, `code_filename.py`, and a near-miss in `handler_raise.py`
that would have baked in `KeyError`'s unquoted message. `code_filename.py`
asserted `FrameSummary._line`, a slot CPython has never had.

### Make new fixtures self-running

End the file with a **top-level** `__main__` block that prints one line per
check. `scripts/check_python_fixtures.sh` then runs it under real CPython on
every push, and a fixture that disagrees fails CI:

```python
if __name__ == '__main__':
    checks = [a_check, another_check]
    for fn in checks:
        print('%-4s %s' % ('OK' if fn() is True else 'FAIL', fn.__name__))
```

A second convention, for checks that answer a value rather than a boolean, is
also recognised — the status word may be the first *or* second field:

```python
    print('%-12s %s %s' % (label, 'OK ' if actual == expected else 'DIFF', actual))
```

Run the file by hand (`python3 tests/python/your_fixture.py`) while writing it:
that output *is* where the expected values come from.

### Checks that document a Grail limitation

Some checks assert something Grail cannot yet do, so CPython is *expected* to
disagree. Put those in a separate list and print `XFAIL`; the gate accepts it.
See the `grail_only` list in `live_frames.py`:

```python
    for fn in grail_only:
        print('%-5s %s' % ('XPASS' if fn() is True else 'XFAIL', fn.__name__))
```

`XPASS` — such a check passing under CPython — **fails** the gate, because it
means the difference the check documents no longer exists and the check is
stale.

### What the gate does and does not cover

It runs only fixtures with a top-level `__main__` block — **99 of 336 files**.
The rest are Smalltalk-driven and mostly cannot run under CPython at all: they
exercise Grail-specific behaviour, return values for the harness to compare
rather than booleans, or are deliberately unimportable. So a green gate does
**not** mean the corpus agrees with CPython.

The 84 is up from 15: a census found every fixture whose public zero-argument
functions all answer `True` under CPython and converted the 23 that were not yet
self-running, then the last two known bug-pinners were corrected and converted
too. That is the move that widens the net — tightening the script is not. **All
four fixtures that historically pinned Grail's behaviour are now covered.**
Treat the gate as holding a line that has been opted into, and make opting in
the default for anything new.

### When a corrected fixture then fails under Grail

Correcting an expectation to what CPython really does can turn up a genuine
Grail gap rather than a typo. Do not resolve that by softening the check back
toward Grail — that is how the fixture became misleading in the first place.
State CPython's rule, and record the gap where a reader will meet it:

* the check keeps a `KNOWN GRAIL GAP` docstring giving the measured CPython
  behaviour, so the gate is green and the fixture is honest;
* the Smalltalk driver **stops asserting that one check** and says in a comment
  why, naming the check — a silent removal reads as an oversight later.

`exception_naming.py`'s `a_legacy_type_is_ignored_when_a_value_is_given` is the
worked example. Note this is not the same as `XFAIL`: an `XFAIL` check asserts a
Grail limitation and *fails* under CPython, whereas this one asserts CPython and
fails under Grail.

**A fixture can pass on import and fail as a script.** The census imports each
file under its real module name; the gate runs it with `__name__` set to
`__main__`. Anything that depends on module identity differs between the two,
which is a feature — it catches expectations that were quietly pinned to one
context. Converting `exception_subclass_args.py` surfaced exactly this: it
asserted a literal `'exception_subclass_args.Empty: boom'`, but
`format_exception_only` qualifies by `__module__` and **CPython suppresses that
prefix entirely for `__main__` and `builtins`** (which is why `ValueError: x`
has no prefix). Derive such a prefix rather than hardcoding it:

```python
prefix = '' if __name__ in ('__main__', 'builtins') else __name__ + '.'
```

Two traps are pinned by `tests/scripts/test_python_fixture_gate.sh`, both of
which look like a passing run:

* The status word is read from a **field**, never by grepping the line —
  `live_frames.py` prints a separator containing the word "FAIL", and a
  grep-based gate fails on a clean tree.
* Only a **column-zero** `__main__` counts. `module_higher_arity_def.py` has that
  string inside a function (it checks the idiom is False on import) and its
  checks assert `__name__ == 'module_higher_arity_def'` — running it as a script
  would falsify the very thing it tests.

Run both locally before opening a PR that adds or edits a fixture:

```bash
scripts/check_python_fixtures.sh -v        # fixtures agree with CPython
tests/scripts/test_python_fixture_gate.sh  # the gate itself still works
```

## Best Practices

### 1. Test Normal Cases First

Start with the happy path:
```smalltalk
testAbs
	| b result |
	b := builtins ___instance___.
	result := b @env1:abs: 5.
	self assert: result equals: 5
%
```

### 2. Test Edge Cases

Include boundary conditions:
```smalltalk
testAbs
	| b result |
	b := builtins ___instance___.
	result := b @env1:abs: 0.
	self assert: result equals: 0.

	result := b @env1:abs: -3.14.
	self assert: ((result - 3.14) abs < 0.0001)
%
```

### 3. Test Error Cases

Verify exceptions are raised correctly:
```smalltalk
testLenTypeError
	self should: [
		builtins ___instance___ @env1:len: 42
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
	self assert: (lst @env1:__getitem__: 0) equals: 10.
	
	"Negative indices"
	self assert: (lst @env1:__getitem__: -1) equals: 50.
	
	"Out of bounds"
	self should: [lst @env1:__getitem__: 5] raise: IndexError
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
category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__len__
	...
%

category: 'Grail-Tests - Sequence Protocol'
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

The standard way to run the whole suite (fresh worker sessions; picks up the
install automatically):

```bash
./scripts/run_tests.sh
```

To run a single test class interactively (`.setenv` and `.topazini` are the
per-machine, gitignored config files — see the project README/CLAUDE.md):

```bash
source .setenv
topaz -lq <<EOF
login
run
BuiltinsTestCase suite run printString
%
logout
EOF
```

### Reading a failure

`run_tests.sh` reports each defect with its **message** and, for errors, a
**stack**, not just the test's name. A red shard looks like this:

```
  [ERROR] SomeTestCase>>testThing
      ValueError: something specific went wrong: 42
      stack:
        16 Zz_fixture >> inner (env 1) @2 line 2  [GsNMethod 1085671425]
        18 Zz_fixture >> boom (env 1) @3 line 2  [GsNMethod 1085670913]
        19 SomeTestCase >> testThing @6 line 5  [GsNMethod 1085670657]
      repro: SomeTestCase debug: #testThing
```

Python-level frames are marked `(env 1)`, and the last line is a
copy-pasteable one-liner that re-runs just that test.

This is not stock SUnit. `TestResult` keeps only the failing `TestCase` — the
exception, its `messageText` and its stack are discarded in the handler — so a
CI log could say no more than `SomeTestCase debug: #testThing` and diagnosing a
red build meant reproducing the run by hand. `GrailTestResult`
(`src/smalltalk/PythonTests/GrailTestResult.gs`) is a `TestResult` subclass that
captures the diagnosis instead; `runTests.gs` and `runTestsShard.gs` use it in
place of the result `TestSuite>>run` would build.

Two knobs:

| variable | effect |
| --- | --- |
| `GRAIL_TEST_STACK_FRAMES` | frames reported per error (default 20; `0` suppresses stacks). Failures never get a stack — the assertion message says everything. |
| `GRAIL_TEST_COLD=1` | disables canonical-class warm binding, so every import recompiles |

Frames that describe the *capture* (the exception handler, the signal
machinery) are trimmed off the top, and everything below SUnit's
`TestCase>>performTest` is dropped, so the frames shown are the ones specific to
this failure.

If you write a runner of your own, use `GrailTestResult run: aSuite` rather than
`aSuite run` — it mirrors `TestSuite>>run` including the `TestResource` reset,
which `TestSuite>>run` cannot be reused for because it hardcodes `TestResult new`.

## Example: Test Methods from a Real File

Here are two test methods from `src/smalltalk/PythonTests/ListTestCase.gs`:

```smalltalk
category: 'Grail-Tests - List Methods'
method: ListTestCase
testAppend
	"Test list.append(item)"

	| lst |
	lst := OrderedCollection withAll: #(1 2 3).

	lst @env1:append: 4.

	self assert: lst size equals: 4.
	self assert: (lst at: 4) equals: 4.
%

category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test__getitem__
	"Test list.__getitem__(index)"

	| lst |
	lst := OrderedCollection withAll: #(10 20 30 40 50).
	
	"Positive indices"
	self assert: (lst @env1:__getitem__: 0) equals: 10.
	
	"Negative indices"
	self assert: (lst @env1:__getitem__: -1) equals: 50.
	
	"Out of bounds"
	self should: [lst @env1:__getitem__: 5] raise: IndexError.
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
- [ ] Use `@env1:` sends for Python methods, direct Smalltalk messages for basic operations
- [ ] Run tests and ensure they pass

## Common Patterns

### Pattern 1: Testing Built-in Functions

```smalltalk
category: 'Grail-Tests - Numeric Functions'
method: BuiltinsTestCase
test{FunctionName}
	| b result |
	b := builtins ___instance___.
	result := b @env1:{functionName}: arg.
	self assert: result equals: expectedValue
%
```

### Pattern 2: Testing Type Methods

```smalltalk
category: 'Grail-Tests - Sequence Protocol'
method: ListTestCase
test{MethodName}
	| lst result |
	lst := OrderedCollection withAll: #(1 2 3).
	result := lst @env1:{methodName}: arg.
	self assert: result equals: expectedValue
%
```

### Pattern 3: Testing Exceptions

```smalltalk
category: 'Grail-Tests-{ExceptionName}'
method: {ExceptionName}TestCase
test_inheritance
	| exc |
	exc := {ExceptionName} ___new___: {ExceptionName}.
	self assert: (exc isKindOf: Exception)
%

category: 'Grail-Tests-{ExceptionName}'
method: {ExceptionName}TestCase
test_creation
	| exc |
	exc := {ExceptionName} ___new___: {ExceptionName}.
	self assert: exc notNil
%
```

## Summary

- **Tests are essential** - Write tests alongside implementation
- **Follow the structure** - Use the established patterns
- **Test comprehensively** - Normal cases, edge cases, error cases
- **Use `@env1:` sends for Python methods** - Direct Smalltalk messages for basic operations
- **Be descriptive** - Clear test names and comments
- **Organize logically** - Use categories to group related tests
- **Verify CPython compatibility** - When possible, compare with CPython behavior

Remember: **Writing tests is equally important as writing the primary code!**

