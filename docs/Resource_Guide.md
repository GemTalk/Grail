# Resource Guide for Grail Development

This guide documents the key resources available when developing Grail, including where to find GemStone Smalltalk capabilities, example code, and reference implementations.

## Overview

When implementing Python features in Grail, you have access to several valuable resources:

1. **`gemstone/` directory** - GemStone Smalltalk reference implementations
2. **`smalltalk/classes/` directory** - Existing Python type implementations
3. **`smalltalk/tests/` directory** - Test examples and patterns
4. **`smalltalk/ast/` directory** - AST node implementations

## The `gemstone/` Directory

The `gemstone/` directory contains **GemStone Smalltalk reference implementations** that define what GemStone supports. This is your primary reference for understanding available GemStone methods and capabilities.

### Key Subdirectories

#### `gemstone/monticello/`

Contains implementations of core GemStone classes. These files show what methods are available on base classes:

- **`object.gs`** - Object class methods (base class for all objects)
- **`collection.gs`** - Collection methods (base for lists, sets, etc.)
- **`sequenceablecollection.gs`** - SequenceableCollection methods (for lists, tuples)
- **`orderedcollection.gs`** - OrderedCollection methods (Python list)
- **`string.gs`** - String methods (Python str)
- **`number.gs`** - Number methods (base for int, float)
- **`integer.gs`** - Integer methods (Python int)
- **`date.gs`** - Date methods
- **`dateandtime.gs`** - DateAndTime methods
- **`bytearray.gs`** - ByteArray methods (Python bytes)
- **`dictionary.gs`** - Dictionary methods (Python dict)
- **`character.gs`** - Character methods
- **`stream.gs`** - Stream methods
- **`readstream.gs`** - ReadStream methods
- **`writestream.gs`** - WriteStream methods

#### `gemstone/rowan/src/`

Contains **GemStone Smalltalk source code in Tonel format** (`.st` files). This is the primary source code repository for GemStone, organized into filein directories. These files contain extensions to existing classes and new class definitions.

**Key Directories:**

- **`Filein1A/`** - Core system classes (135 files)
- **`Filein1B/`** - Reflection and upgrade classes
- **`Filein1C/`** - Additional core classes (92 files)
- **`Filein2A/`** - System extensions (Object, Collection, Error, etc.)
- **`Filein2Streams/`** - Stream implementations (52 files)
- **`Filein2Traits/`** - Trait system
- **`Filein3A/`** - System classes (168 files)
- **`Filein3B/`** - Extensive system extensions (374 files)
  - **`System.extension.st`** - System class extensions
  - **`Object.extension.st`** - Object class extensions
  - **`String.extension.st`** - String extensions
  - **`Collection.extension.st`** - Collection extensions
  - **`ByteArray.extension.st`** - ByteArray extensions
  - **`Unicode7.extension.st`** - Unicode7 (Python str) extensions
  - And many more...
- **`Filein3B-BootstrapOnly/`** - Bootstrap-only classes
- **`Filein3C-ObsoleteClasses/`** - Obsolete classes (37 files)
- **`Filein3D-CompilerClasses/`** - Compiler classes (20 files)
- **`Filein3E-CompilerClasses/`** - Additional compiler classes (2 files)
- **`Filein4-CompilerClasses/`** - Newer compiler classes (21 files)
- **`Filein4-ObsoleteClasses/`** - More obsolete classes (47 files)
- **`Filein4Rowan/`** - Rowan package management (192 files)
- **`GemStone-Rowan-Tools/`** - Rowan tools
- **`X509-Core/`** - X509 certificate support (7 files)

**File Naming Convention:**

- **`{ClassName}.extension.st`** - Extensions to existing classes (adds methods)
- **`{ClassName}.class.st`** - New class definitions
- **`package.st`** - Package metadata

**How to Use `gemstone/rowan/src/` Files:**

1. **Find class extensions**: Look for `{ClassName}.extension.st` files
   - Example: `Object.extension.st` shows methods added to Object
   - Example: `String.extension.st` shows methods added to String
   - Example: `Unicode7.extension.st` shows methods for Unicode7 (Python str)

2. **Find new classes**: Look for `{ClassName}.class.st` files
   - Example: `GsFileIn.class.st` defines the GsFileIn class
   - Example: `GsPackage.class.st` defines the GsPackage class

3. **Understand method implementations**: See how GemStone implements methods
   - Tonel format is readable and shows method source code
   - Methods are organized by category
   - Shows both instance and class methods

4. **Search for specific functionality**: 
   - Search for class names to find extensions
   - Search for method names to find implementations
   - Look in relevant filein directories

**Example: Finding String Methods**

```bash
# Look at gemstone/rowan/src/Filein3B/String.extension.st
# This shows methods added to the String class
# Also check gemstone/monticello/string.gs for base methods
```

**Example: Finding Unicode7 Methods (Python str)**

```bash
# Look at gemstone/rowan/src/Filein3B/Unicode7.extension.st
# This shows methods specific to Unicode7, which is used for Python str
```

**Example: Finding System Methods**

```bash
# Look at gemstone/rowan/src/Filein3B/System.extension.st
# This shows methods added to the System class
```

### How to Use `gemstone/` Files

1. **Find available methods**: 
   - Check `gemstone/monticello/{classname}.gs` for base methods
   - Check `gemstone/rowan/src/Filein*/{ClassName}.extension.st` for extensions
2. **Understand method signatures**: See how methods are called and what they return
3. **Learn GemStone patterns**: Understand how GemStone implements common operations
4. **Compare implementations**: See both base methods (monticello) and extensions (rowan)

### Example: Finding String Methods

To see what string methods are available:

```bash
# Base methods in gemstone/monticello/string.gs:
# - asLowercase
# - asUppercase
# - includesString:
# - indexOf:
# - copyFrom:to:
# - etc.

# Extensions in gemstone/rowan/src/Filein3B/String.extension.st:
# - Additional methods added to String class
# - Check this file for more advanced string operations
```

### Example: Finding Unicode7 Methods (Python str)

Unicode7 is the GemStone class used for Python `str`:

```bash
# Check gemstone/rowan/src/Filein3B/Unicode7.extension.st
# This shows methods specific to Unicode7
# Also check gemstone/monticello/string.gs for base string methods
```

### Example: Finding Collection Methods

To see what collection methods are available:

```bash
# Base methods in gemstone/monticello/collection.gs:
# - size
# - isEmpty
# - includes:
# - do:
# - collect:
# - select:
# - etc.

# Extensions in gemstone/rowan/src/Filein3B/Collection.extension.st:
# - Additional collection methods
# - Advanced collection operations
```

### Example: Finding System Methods

```bash
# Check gemstone/rowan/src/Filein3B/System.extension.st
# This shows methods added to the System class
# Useful for system-level operations
```

## The `smalltalk/classes/` Directory

The `smalltalk/classes/` directory contains **existing Python type implementations**. Use these as examples when implementing new features.

### Key Files

- **`classes.gs`** - Class definitions (DO NOT create subclasses elsewhere)
- **`builtins.gs`** - Built-in functions implementation
- **`object.gs`** - Object Python methods
- **`str.gs`** - String (Unicode7) Python methods
- **`list.gs`** - List (OrderedCollection) Python methods
- **`dict.gs`** - Dictionary Python methods
- **`int.gs`** - Integer Python methods
- **`float.gs`** - Float Python methods
- **`tuple.gs`** - Tuple (InvariantArray) Python methods
- **`set.gs`** - Set Python methods
- **`range.gs`** - Range (Interval) Python methods
- **`math.gs`** - Math module implementation
- **`cmath.gs`** - CMath module implementation
- **`complex.gs`** - Complex number implementation

### How to Use `smalltalk/classes/` Files

1. **Find similar implementations**: Look for classes that do similar things
2. **Copy patterns**: Use the same structure and style
3. **Understand environment IDs**: See how `env: 0` vs `env: 2` is used
4. **Learn method organization**: See how methods are categorized

### Example: Implementing a New Built-in Function

Look at `smalltalk/classes/builtins.gs`:

```smalltalk
category: 'Python-Built-in Functions'
method: builtins
abs: aNumber
	"Return the absolute value of a number"

	[^ aNumber __abs__] perform: #on:do: env: 0 withArguments: {MessageNotUnderstood. [:ex | TypeError perform: #signal env: 0]}
%
```

This shows:
- How to structure a built-in function
- How to handle errors
- How to call Python methods (`__abs__`)
- How to raise Python exceptions

### Example: Implementing Sequence Methods

Look at `smalltalk/classes/list.gs` or `smalltalk/classes/SequenceableCollection.gs`:

```smalltalk
category: 'Python-Sequence Protocol'
method: SequenceableCollection
__getitem__: index
	"Return the item at the given index.
	Supports negative indices (counting from end)."

	| size idx |
	size := self perform: #size env: 0.
	idx := index.
	
	"Handle negative indices"
	(idx perform: #< env: 0 withArguments: {0}) ifTrue: [
		idx := size perform: #+ env: 0 withArguments: {idx}
	].
	
	"Check bounds"
	((idx perform: #< env: 0 withArguments: {0}) or: [
		idx perform: #>= env: 0 withArguments: {size}
	]) ifTrue: [
		IndexError perform: #signal: env: 0 withArguments: {'list index out of range'}
	].
	
	"Convert to 1-based Smalltalk index"
	^ self perform: #at: env: 0 withArguments: {idx perform: #+ env: 0 withArguments: {1}}
%
```

This shows:
- How to implement Python protocol methods
- How to handle negative indices
- How to check bounds
- How to convert between Python (0-based) and Smalltalk (1-based) indexing
- How to raise Python exceptions

## The `smalltalk/tests/` Directory

The `smalltalk/tests/` directory contains **test implementations**. Use these as examples when writing tests for new features.

### Key Files

- **`Tests.gs`** - Test class definitions
- **`PythonTestCase.gs`** - Base test class
- **`BuiltinsTestCase.gs`** - Built-in functions tests
- **`ListTestCase.gs`** - List tests
- **`MathTestCase.gs`** - Math module tests
- **`StrTestCase.gs`** - String tests
- **`exceptions/`** - Exception tests

### How to Use `smalltalk/tests/` Files

1. **Find similar tests**: Look for tests that test similar functionality
2. **Copy test structure**: Use the same test method structure
3. **Learn assertion patterns**: See how to test different scenarios
4. **Understand test categories**: See how tests are organized

### Example: Testing a Built-in Function

Look at `smalltalk/tests/BuiltinsTestCase.gs`:

```smalltalk
category: 'Tests - Numeric Functions'
method: BuiltinsTestCase
testAbs
	"Test abs() function"

	| b result |
	b := builtins perform: #new env: 0.
	
	result := b perform: #abs: env: 2 withArguments: {5}.
	self assert: result equals: 5.
	
	result := b perform: #abs: env: 2 withArguments: {-5}.
	self assert: result equals: 5.
	
	result := b perform: #abs: env: 2 withArguments: {0}.
	self assert: result equals: 0
%
```

This shows:
- How to create test objects
- How to call Python methods in tests
- How to use assertions
- How to test multiple cases

### Example: Testing Exceptions

Look at `smalltalk/tests/exceptions/TypeErrorTestCase.gs`:

```smalltalk
category: 'Python-Tests-TypeError'
method: TypeErrorTestCase
test_inheritance
	"Test that TypeError inherits from Exception."
	
	| exc |
	exc := TypeError perform: #__new__: env: 2 withArguments: { TypeError }.
	self assert: (exc isKindOf: Exception)
%
```

This shows:
- How to test exception creation
- How to test inheritance
- How to use `isKindOf:` for type checking

## Finding GemStone Methods

### Method 1: Check `gemstone/monticello/` Files

1. Identify the base class (Object, Collection, String, Number, etc.)
2. Look in `gemstone/monticello/{classname}.gs`
3. Find the method you need

### Method 2: Check Existing Grail Code

1. Look in `smalltalk/classes/` for similar implementations
2. See what GemStone methods they use
3. Follow the same pattern

### Method 3: Use GemStone Documentation

- GemStone documentation is available in the product
- Use `goodies.gs` examples (see `gemstone/examples/goodies.gs`)
- Check `AAREADME.txt` for useful commands

### Method 4: Explore in Topaz

You can explore available methods interactively:

```smalltalk
"See all methods on a class"
| r lf |
lf := Character lf.
(r := String new) add: lf.
String allSelectors do: [:each |
  r addAll: each; add: lf ].
^r

"See source code for a method"
^String sourceCodeAt: #asLowercase
```

## Common GemStone Methods Used in Grail

### Object Methods (from `gemstone/monticello/object.gs`)

- `perform:env:` - Call a method by selector with environment
- `perform:env:withArguments:` - Call a method with arguments
- `class` - Get the class of an object
- `isKindOf:` - Check if object is instance of class
- `printString` - Get string representation
- `physicalSize` - Get size in bytes

### Collection Methods (from `gemstone/monticello/collection.gs`)

- `size` - Get number of elements
- `isEmpty` - Check if empty
- `includes:` - Check if contains element
- `do:` - Iterate over elements
- `collect:` - Transform elements
- `select:` - Filter elements
- `add:` - Add element
- `remove:` - Remove element
- `at:` - Get element at index (1-based)
- `at:put:` - Set element at index

### String Methods (from `gemstone/monticello/string.gs`)

- `asLowercase` - Convert to lowercase
- `asUppercase` - Convert to uppercase
- `includesString:` - Check if contains substring
- `indexOf:` - Find index of character
- `copyFrom:to:` - Extract substring
- `,` (comma) - Concatenate strings
- `size` - Get length

### Number Methods (from `gemstone/monticello/number.gs`)

- `+`, `-`, `*`, `/` - Arithmetic operations
- `abs` - Absolute value
- `sqrt` - Square root
- `ln` - Natural logarithm
- `exp` - Exponential
- `sin`, `cos`, `tan` - Trigonometric functions
- `arcSin`, `arcCos`, `arcTan` - Inverse trigonometric
- `asInteger` - Convert to integer
- `asFloat` - Convert to float
- `factorial` - Factorial
- `gcd:` - Greatest common divisor
- `lcm:` - Least common multiple

### Integer Methods (from `gemstone/monticello/integer.gs`)

- `printStringRadix:` - Convert to string in given base
- `factorial` - Factorial
- `gcd:`, `lcm:` - GCD and LCM

### Float Methods

- `_isNaN` - Check if NaN
- `_getKind` - Get float kind (normal, infinity, NaN, etc.)
- `ceiling` - Round up
- `floor` - Round down
- `truncated` - Truncate to integer
- `radiansToDegrees` - Convert radians to degrees
- `degreesToRadians` - Convert degrees to radians

## Environment IDs

Understanding environment IDs is crucial:

- **`env: 0`** - Smalltalk environment (base GemStone methods)
  - Use for: Creating objects, calling GemStone base methods
  - Example: `builtins perform: #new env: 0`
  - Example: `self perform: #size env: 0`
  
- **`env: 2`** - Python environment (Python methods)
  - Use for: Calling Python protocol methods
  - Example: `obj perform: #__len__ env: 2`
  - Example: `lst perform: #__getitem__: env: 2 withArguments: {0}`

## Code Patterns

### Pattern 1: Calling GemStone Methods

```smalltalk
"Call a unary method"
result := self perform: #size env: 0

"Call a binary method"
result := x perform: #+ env: 0 withArguments: {y}

"Call a keyword method"
result := self perform: #at: env: 0 withArguments: {index}
```

### Pattern 2: Calling Python Methods

```smalltalk
"Call a Python method"
result := obj perform: #__len__ env: 2

"Call a Python method with arguments"
result := lst perform: #__getitem__: env: 2 withArguments: {0}
```

### Pattern 3: Error Handling

```smalltalk
"Try to call a method, catch error"
[^ obj perform: #__len__ env: 2] perform: #on:do: env: 0 withArguments: {
	MessageNotUnderstood. 
	[:ex | TypeError perform: #signal: env: 0 withArguments: {'object has no len()'}]
}
```

### Pattern 4: Type Checking

```smalltalk
"Check if object is instance of class"
(obj perform: #isKindOf: env: 0 withArguments: {str}) ifTrue: [
	^ obj
]
```

## Quick Reference

### Where to Look For...

| What You Need | Where to Look |
|--------------|---------------|
| Base GemStone methods | `gemstone/monticello/{classname}.gs` |
| Extended GemStone methods | `gemstone/rowan/src/Filein*/{ClassName}.extension.st` |
| New GemStone classes | `gemstone/rowan/src/Filein*/{ClassName}.class.st` |
| Python type implementation examples | `smalltalk/classes/{typename}.gs` |
| Test examples | `smalltalk/tests/{ClassName}TestCase.gs` |
| Class definitions | `smalltalk/classes/classes.gs` |
| AST node examples | `smalltalk/ast/{NodeName}Ast.gs` |
| Built-in function examples | `smalltalk/classes/builtins.gs` |
| Math function examples | `smalltalk/classes/math.gs` |
| Exception examples | `smalltalk/classes/BaseException.gs` |

### Common Tasks

| Task | Example File |
|------|--------------|
| Implement a built-in function | `smalltalk/classes/builtins.gs` |
| Implement a list method | `smalltalk/classes/list.gs` |
| Implement a string method | `smalltalk/classes/str.gs` |
| Implement a dict method | `smalltalk/classes/dict.gs` |
| Implement a math function | `smalltalk/classes/math.gs` |
| Write tests for built-ins | `smalltalk/tests/BuiltinsTestCase.gs` |
| Write tests for lists | `smalltalk/tests/ListTestCase.gs` |
| Write tests for exceptions | `smalltalk/tests/exceptions/TypeErrorTestCase.gs` |

## Best Practices

1. **Always check `gemstone/` first** - See what GemStone provides before implementing
   - Check `gemstone/monticello/` for base methods
   - Check `gemstone/rowan/src/` for extensions and additional classes
2. **Look for similar code** - Find existing implementations that do similar things
3. **Follow existing patterns** - Use the same structure and style as existing code
4. **Use correct environment IDs** - `env: 0` for Smalltalk, `env: 2` for Python
5. **Write tests** - Always write tests alongside implementation
6. **Reference CPython** - Verify behavior matches CPython when possible
7. **Search both monticello and rowan** - Base methods may be in monticello, extensions in rowan

## Summary

- **`gemstone/monticello/`** - Base GemStone class implementations (`.gs` files)
- **`gemstone/rowan/src/`** - GemStone source code in Tonel format (`.st` files)
  - Extensions to existing classes (`.extension.st`)
  - New class definitions (`.class.st`)
- **`smalltalk/classes/`** - Examples of Python implementations
- **`smalltalk/tests/`** - Examples of test patterns
- **Use existing code as templates** - Don't reinvent the wheel
- **Check GemStone methods first** - See what's already available
  - Check both `monticello/` for base methods and `rowan/src/` for extensions
- **Follow established patterns** - Maintain consistency

Remember: 
- The existing code in `smalltalk/classes/` and `smalltalk/tests/` are your best examples for how to implement new features!
- The `gemstone/` directory (both `monticello/` and `rowan/src/`) shows what GemStone supports
- Always check both locations when looking for available methods

