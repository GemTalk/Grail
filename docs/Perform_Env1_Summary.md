# Summary of `perform:env: 1` Message Senders

This document provides a comprehensive summary of all places in the codebase that use `perform:env: 1` to send messages to environment 1 (Python methods).

## Overview

- **Total `perform:env: 1` calls**: 2,169
- **Unique message selectors**: ~150+

## Top 30 Most Frequently Sent Messages

| Count | Message Selector | Description |
|-------|-----------------|-------------|
| 198 | `__new__:` | Single-argument constructor |
| 195 | `__new__:_:` | Two-argument constructor (e.g., complex numbers) |
| 119 | `__len__` | Length/size of collection |
| 75 | `__contains__:` | Membership test |
| 72 | `add:` | Add element to collection |
| 71 | `append:` | Append to sequence |
| 71 | `__setitem__:_:` | Set item at index |
| 69 | `__next__` | Iterator next element |
| 58 | `__getitem__:` | Get item at index |
| 46 | `__eq__:` | Equality comparison |
| 40 | `__iter__` | Get iterator |
| 37 | `__new__:_:_:` | Three-argument constructor |
| 34 | `exists:` | File/path existence check |
| 33 | `__repr__` | String representation |
| 28 | `imag` | Complex number imaginary part |
| 26 | `real` | Complex number real part |
| 23 | `__str__` | String conversion |
| 22 | `__add__:` | Addition operator |
| 21 | `__ne__:` | Inequality comparison |
| 20 | `remove:` | Remove element |
| 19 | `__mul__:` | Multiplication operator |
| 18 | `rmdir:` | Remove directory |
| 18 | `__new__` | Zero-argument constructor |
| 16 | `path` | Path property |
| 16 | `__lt__:` | Less-than comparison |
| 14 | `pi` | Mathematical constant π |
| 14 | `index:` | Find index of element |
| 14 | `__new__:_:_:_:` | Four-argument constructor |
| 14 | `__bool__` | Boolean conversion |
| 13 | `count:` | Count occurrences |

## Files with Most `perform:env: 1` Calls

| Count | File | Primary Usage |
|-------|------|---------------|
| 52 | `smalltalk/tests/BytearrayTestCase.gs` | Testing bytearray operations |
| 42 | `smalltalk/tests/BytesTestCase.gs` | Testing bytes operations |
| 33 | `smalltalk/tests/DictTestCase.gs` | Testing dictionary operations |
| 27 | `smalltalk/tests/ComplexTestCase.gs` | Testing complex number operations |
| 24 | `smalltalk/tests/SetTestCase.gs` | Testing set operations |
| 23 | `smalltalk/tests/BytearrayTestCase.gs` | Constructor calls |
| 20 | `smalltalk/tests/SetTestCase.gs` | Set manipulation |
| 20 | `smalltalk/tests/IteratorTestCase.gs` | Iterator operations |
| 20 | `smalltalk/tests/BytesTestCase.gs` | Length checks |
| 19 | `smalltalk/tests/SetTestCase.gs` | Set operations |
| 19 | `smalltalk/tests/IteratorTestCase.gs` | Iterator error handling |
| 16 | `smalltalk/tests/OsTestCase.gs` | OS path operations |
| 15 | `smalltalk/tests/BytearrayTestCase.gs` | Length assertions |
| 13 | `smalltalk/tests/RangeTestCase.gs` | Range creation |
| 12 | `smalltalk/tests/CMathTestCase.gs` | Complex math operations |
| 12 | `smalltalk/tests/BytesTestCase.gs` | Bytes creation |
| 12 | `smalltalk/tests/BytesTestCase.gs` | Bytes operations |
| 11 | `smalltalk/tests/OsTestCase.gs` | File existence checks |
| 11 | `smalltalk/tests/FloatTestCase.gs` | Float creation |
| 11 | `smalltalk/tests/BytesTestCase.gs` | Separator creation |

## Message Categories

### 1. Object Creation (`__new__` variants)
- **Total**: ~450+ calls
- **Messages**: `__new__`, `__new__:`, `__new__:_:`, `__new__:_:_:`, `__new__:_:_:_:`
- **Usage**: Creating instances of Python types from Smalltalk code
- **Examples**:
  - `complex perform: #__new__:_: env: 1 withArguments: {3. 4}`
  - `bytes perform: #__new__:_: env: 1 withArguments: {data. encoding}`

### 2. Collection Operations
- **Total**: ~400+ calls
- **Messages**: `__len__`, `__getitem__:`, `__setitem__:_:`, `__contains__:`, `add:`, `append:`, `remove:`, `__iter__`, `__next__`
- **Usage**: Manipulating Python collections (list, dict, set, bytes, etc.)
- **Examples**:
  - `list perform: #__len__ env: 1`
  - `dict perform: #__setitem__:_: env: 1 withArguments: {key. value}`

### 3. Comparison Operations
- **Total**: ~100+ calls
- **Messages**: `__eq__:`, `__ne__:`, `__lt__:`, `__gt__:`, `__le__:`, `__ge__:`
- **Usage**: Comparing Python objects
- **Examples**:
  - `obj1 perform: #__eq__: env: 1 withArguments: {obj2}`
  - `num1 perform: #__lt__: env: 1 withArguments: {num2}`

### 4. Arithmetic Operations
- **Total**: ~80+ calls
- **Messages**: `__add__:`, `__sub__:`, `__mul__:`, `__truediv__:`, `__floordiv__:`, `__mod__:`, `__pow__:`, `__neg__`, `__pos__`, `__abs__`
- **Usage**: Mathematical operations on Python numbers
- **Examples**:
  - `num1 perform: #__add__: env: 1 withArguments: {num2}`
  - `complex perform: #__mul__: env: 1 withArguments: {other}`

### 5. String/Representation Operations
- **Total**: ~60+ calls
- **Messages**: `__str__`, `__repr__`, `real`, `imag`
- **Usage**: Converting objects to strings, accessing complex number parts
- **Examples**:
  - `obj perform: #__repr__ env: 1`
  - `c perform: #real env: 1`

### 6. File System Operations
- **Total**: ~50+ calls
- **Messages**: `exists:`, `path`, `rmdir:`, `isfile:`, `isdir:`, `getcwd`, `listdir`, `mkdir:`, `basename:`, `dirname:`, `normpath:`, `isabs:`, `abspath:`, `splitext:`, `commonprefix:`, `commonpath:`, `join:`, `joinAll:`, `join:_:`, `join:_:_:`, `join:_:_:_:`
- **Usage**: File and path operations via `os` and `os.path` modules
- **Examples**:
  - `pathObj perform: #exists: env: 1 withArguments: {path}`
  - `os perform: #getcwd env: 1`

### 7. Mathematical Functions
- **Total**: ~40+ calls
- **Messages**: `pi`, `e`, `tau`, `inf`, `nan`, `nanj`, `infj`, `exp:`, `log:`, `log2:`, `log10:`, `sqrt:`, `sin:`, `cos:`, `tan:`, `sinh:`, `cosh:`, `tanh:`, `asin:`, `acos:`, `atan:`, `atan2:_:`, `phase:`, `polar:`, `rect:_:`, `isnan:`, `isinf:`, `isfinite:`
- **Usage**: Mathematical constants and functions from `math` and `cmath` modules
- **Examples**:
  - `cmath perform: #pi env: 1`
  - `cmath perform: #sqrt: env: 1 withArguments: {z}`

### 8. Type Conversion
- **Total**: ~30+ calls
- **Messages**: `__int__`, `__float__`, `__bool__`, `__complex__`, `__str__`, `__repr__`
- **Usage**: Converting between Python types
- **Examples**:
  - `num perform: #__int__ env: 1`
  - `obj perform: #__bool__ env: 1`

### 9. String Operations
- **Total**: ~100+ calls
- **Messages**: `startswith:`, `endswith:`, `find:`, `rfind:`, `index:`, `rindex:`, `split:`, `split:_:`, `rsplit:_:`, `splitlines`, `strip`, `lstrip`, `rstrip`, `upper`, `lower`, `title`, `capitalize`, `swapcase`, `casefold`, `isalpha`, `isdigit`, `isalnum`, `isspace`, `isupper`, `islower`, `istitle`, `isascii`, `isdecimal`, `isnumeric`, `isprintable`, `isidentifier`, `zfill:`, `center:`, `ljust:`, `rjust:`, `expandtabs`, `expandtabs:`, `replace:_:`, `partition:`, `rpartition:`, `maketrans:_:`, `translate:`, `removesuffix:`, `removeprefix:`, `encode`, `decode`, `decode:`, `fromhex:_:`, `hex`, `oct`, `bin`, `ord:`, `chr:`, `count:`, `join:`, `joinAll:`
- **Usage**: String manipulation methods
- **Examples**:
  - `str perform: #startswith: env: 1 withArguments: {prefix}`
  - `str perform: #find: env: 1 withArguments: {sub}`

### 10. Dictionary/Set Operations
- **Total**: ~50+ calls
- **Messages**: `__setitem__:_:`, `__getitem__:`, `get:`, `get:_:`, `setdefault:`, `setdefault:_:`, `pop`, `pop:`, `popitem`, `update:`, `keys`, `values`, `items`, `union:`, `intersection:`, `difference:`, `symmetric_difference:`, `issubset:`, `issuperset:`, `isdisjoint:`, `intersection_update:`, `difference_update:`, `symmetric_difference_update:`, `discard:`, `clear`
- **Usage**: Dictionary and set manipulation
- **Examples**:
  - `dict perform: #get: env: 1 withArguments: {key}`
  - `set1 perform: #union: env: 1 withArguments: {set2}`

### 11. List/Sequence Operations
- **Total**: ~40+ calls
- **Messages**: `append:`, `extend:`, `insert:_:`, `pop`, `pop:`, `remove:`, `index:`, `count:`, `reverse`, `sort:`, `copy`, `clear`
- **Usage**: List and sequence manipulation
- **Examples**:
  - `list perform: #append: env: 1 withArguments: {item}`
  - `list perform: #insert:_: env: 1 withArguments: {index. item}`

### 12. Integer Operations
- **Total**: ~20+ calls
- **Messages**: `bit_length`, `bit_count`, `is_integer`, `as_integer_ratio`, `numerator`, `denominator`, `gcd:_:`, `lcm:_:`, `factorial:`, `__round__`, `__trunc__`, `__floor__`, `__ceil__`, `__index__`, `__and__:`, `__or__:`, `__xor__:`, `__invert__`, `__lshift__:`, `__rshift__:`, `__divmod__:`, `divmod:_:`, `pow:_:`, `pow:_:_:`
- **Usage**: Integer-specific operations
- **Examples**:
  - `int perform: #bit_length env: 1`
  - `int1 perform: #gcd:_: env: 1 withArguments: {int2}`

### 13. Float Operations
- **Total**: ~15+ calls
- **Messages**: `is_integer`, `as_integer_ratio`, `__round__`, `__trunc__`, `__floor__`, `__ceil__`, `abs:`, `fabs:`, `round:`, `floor:`, `ceil:`, `trunc:`
- **Usage**: Float-specific operations
- **Examples**:
  - `float perform: #is_integer env: 1`
  - `math perform: #abs: env: 1 withArguments: {x}`

### 14. Iterator Operations
- **Total**: ~90+ calls
- **Messages**: `__iter__`, `__next__`
- **Usage**: Iterating over Python collections
- **Examples**:
  - `collection perform: #__iter__ env: 1`
  - `iter perform: #__next__ env: 1`

### 15. Type Checking
- **Total**: ~10+ calls
- **Messages**: `isinstance:_:`, `type:`, `__class__`, `callable:`
- **Usage**: Type checking and introspection
- **Examples**:
  - `obj perform: #isinstance:_: env: 1 withArguments: {type}`
  - `obj perform: #__class__ env: 1`

### 16. Other Operations
- **Total**: ~100+ calls
- **Messages**: Various other Python methods including `__dir__`, `__hash__`, `__doc__`, `__repr__`, `__str__`, `__bool__`, `__complex__`, `__init__`, `__init__:_:`, `__delitem__:`, `__reversed__`, `__sizeof__`, `__iadd__:`, `__isub__:`, `__imul__:`, `__ior__:`, `__iand__:`, `__ixor__:`, `__rmul__:`, `__divmod__:`, `__index__`, `__round__`, `__init_subclass__`, `id:`, `hash:`, `repr:`, `str:`, `sum:`, `any:`, `all:`, `enumerate:`, `zip:`, `sorted:`, `len:`, `print:`, `system:`, `stat:`, `lstat:`, `rename:_:`, `makedirs:`, `mkdir:_:`, `chdir:`, `putenv:_:`, `getenv:`, `getenv:_:`, `sep`, `pathsep`, `linesep`, `args`, `step`, `start`, `stop`
- **Usage**: Miscellaneous Python operations

## Primary Usage Patterns

### 1. Test Files
The majority of `perform:env: 1` calls are in test files, where Smalltalk test code needs to call Python methods to verify behavior.

### 2. AST Code Generation
Some AST nodes generate Smalltalk code that calls Python constructors (e.g., `ConstantAst.gs` for complex numbers).

### 3. Cross-Environment Communication
When Smalltalk code (env 0) needs to interact with Python objects (env 1), it uses `perform:env: 1`.

## Notes

- Most calls are in test files, which is expected since tests need to verify Python behavior from Smalltalk
- The most common pattern is object creation (`__new__` variants)
- Collection operations are heavily used for testing Python collections
- File system operations are common in OS/path tests
- Mathematical functions are used in math/cmath tests

## Potential Refactoring Opportunities

While most `perform:env: 1` calls are necessary for cross-environment communication, some frequently-used patterns might benefit from convenience methods similar to the `___` methods created for `perform:env: 0` calls. However, this would need to be evaluated on a case-by-case basis, as the primary use case (tests) may benefit from the explicit `perform:env: 1` syntax for clarity.

