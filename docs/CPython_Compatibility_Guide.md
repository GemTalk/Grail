# CPython Compatibility Guide

This document outlines what Grail needs to implement to be compatible with CPython, based on the [Python 3 Standard Library](https://docs.python.org/3/library/index.html).

## Overview

The Python Standard Library is organized into several categories. This guide prioritizes modules based on:
1. **Core functionality** - Essential for basic Python programs
2. **Common usage** - Frequently used in real-world applications
3. **Dependencies** - Required by other modules or features

## Current Implementation Status

### ✅ Fully Implemented
- **Built-in Functions**: Most core functions (see `docs/Built-in Functions.md`)
- **Built-in Types**: `int`, `float`, `str`, `list`, `dict`, `tuple`, `set`, `frozenset`, `bytes`, `bytearray`, `bool`, `complex`, `range`
- **Math Module**: All functions complete (see `docs/Math.md`)
- **CMath Module**: All functions complete (see `docs/CMath.md`)
- **OS Module**: File and directory operations, process management, environment variables, and `os.path` module complete
  - File operations: `getcwd()`, `chdir()`, `listdir()`, `mkdir()`, `makedirs()`, `remove()`, `rmdir()`, `rename()`, `exists()`, `isdir()`, `isfile()`, `stat()`, `lstat()`
  - Process management: `system()`
  - Environment variables: `getenv()`, `putenv()`
  - Constants: `sep`, `pathsep`, `linesep`
  - Path module: `join()`, `basename()`, `dirname()`, `split()`, `splitext()`, `isabs()`, `normpath()`, `abspath()`, `exists()`, `isdir()`, `isfile()`, `commonpath()`, `commonprefix()`
- **Exceptions**: Base exception hierarchy implemented

### 🚧 Partially Implemented
- **Built-in Functions**: Several functions still need implementation (see `docs/Built-in Functions.md` for details)
  - Iterator-related: `iter()`, `next()`, `enumerate()`, `zip()`, `filter()`, `reversed()`
  - Attribute access: `getattr()`, `setattr()`, `delattr()`, `hasattr()`, `vars()`
  - Code execution: `compile()`, `eval()`, `exec()`
  - Object introspection: `id()`, `hash()`, `ascii()`, `format()`, `super()`
  - Decorators: `classmethod()`, `staticmethod()`, `property()`
  - Async: `aiter()`, `anext()`
  - Other: `object()`, `slice()`, `memoryview()`, `help()`, `__import__()`

### ❌ Not Yet Implemented

#### Core Modules (High Priority)

1. **`sys` Module** - System-specific parameters and functions
   - Reference: https://docs.python.org/3/library/sys.html
   - Key attributes: `argv`, `path`, `modules`, `stdin`, `stdout`, `stderr`, `version`, `platform`
   - Status: Some documentation exists in `docs/sys.txt` and `docs/sys.modules.txt`

3. **`io` Module** - Core tools for working with streams
   - Reference: https://docs.python.org/3/library/io.html
   - Key classes: `TextIOWrapper`, `BufferedReader`, `BufferedWriter`, `StringIO`, `BytesIO`
   - Status: `open()` built-in exists, but full `io` module needed

4. **`importlib` / Import System**
   - Reference: https://docs.python.org/3/library/importlib.html
   - Key: `__import__()` built-in function
   - Status: Basic import works, but full importlib features needed

#### Text Processing (High Priority)

5. **`string` Module** - Common string operations
   - Reference: https://docs.python.org/3/library/string.html
   - Key: Constants like `string.ascii_letters`, `string.digits`, `string.punctuation`
   - Template class for string substitution

6. **`re` Module** - Regular expressions
   - Reference: https://docs.python.org/3/library/re.html
   - Key: `match()`, `search()`, `findall()`, `sub()`, `compile()`
   - Note: May need to map to GemStone's regex capabilities

7. **`json` Module** - JSON encoder and decoder
   - Reference: https://docs.python.org/3/library/json.html
   - Key: `load()`, `loads()`, `dump()`, `dumps()`

#### Data Types (Medium Priority)

8. **`datetime` Module** - Date and time objects
   - Reference: https://docs.python.org/3/library/datetime.html
   - Key classes: `datetime`, `date`, `time`, `timedelta`, `timezone`
   - Note: Map to GemStone's Date/Time classes

9. **`collections` Module** - Specialized container datatypes
   - Reference: https://docs.python.org/3/library/collections.html
   - Key: `deque`, `Counter`, `defaultdict`, `OrderedDict`, `namedtuple`, `ChainMap`

10. **`array` Module** - Efficient arrays of numeric values
    - Reference: https://docs.python.org/3/library/array.html
    - Key: Type codes for efficient numeric arrays

11. **`struct` Module** - Interpret bytes as packed binary data
    - Reference: https://docs.python.org/3/library/struct.html
    - Key: `pack()`, `unpack()`, `calcsize()`

#### Numeric and Mathematical (Medium Priority)

12. **`decimal` Module** - Decimal fixed point and floating point arithmetic
    - Reference: https://docs.python.org/3/library/decimal.html
    - Key: `Decimal` class
    - Status: `ScaledDecimal` mapping exists, but full `decimal` module needed

13. **`fractions` Module** - Rational numbers
    - Reference: https://docs.python.org/3/library/fractions.html
    - Key: `Fraction` class

14. **`random` Module** - Generate pseudo-random numbers
    - Reference: https://docs.python.org/3/library/random.html
    - Key: `random()`, `randint()`, `choice()`, `shuffle()`, etc.

15. **`statistics` Module** - Statistical functions
    - Reference: https://docs.python.org/3/library/statistics.html
    - Key: `mean()`, `median()`, `stdev()`, `variance()`, etc.

#### Functional Programming (Medium Priority)

16. **`itertools` Module** - Functions creating iterators for efficient looping
    - Reference: https://docs.python.org/3/library/itertools.html
    - Key: `count()`, `cycle()`, `repeat()`, `chain()`, `product()`, `permutations()`, `combinations()`

17. **`functools` Module** - Higher-order functions and operations on callable objects
    - Reference: https://docs.python.org/3/library/functools.html
    - Key: `reduce()`, `partial()`, `lru_cache()`, `wraps()`, `total_ordering()`

18. **`operator` Module** - Standard operators as functions
    - Reference: https://docs.python.org/3/library/operator.html
    - Key: `add()`, `sub()`, `mul()`, `truediv()`, `mod()`, `eq()`, `lt()`, etc.

#### File and Directory Access (High Priority)

19. **`pathlib` Module** - Object-oriented filesystem paths
    - Reference: https://docs.python.org/3/library/pathlib.html
    - Key: `Path` class for path manipulation
    - Note: May need adaptation for GemStone environment

20. **`shutil` Module** - High-level file operations
    - Reference: https://docs.python.org/3/library/shutil.html
    - Key: `copy()`, `move()`, `rmtree()`, etc.

21. **`tempfile` Module** - Generate temporary files and directories
    - Reference: https://docs.python.org/3/library/tempfile.html
    - Key: `NamedTemporaryFile()`, `TemporaryDirectory()`, `mkstemp()`, `mkdtemp()`

#### Data Persistence (Medium Priority)

22. **`pickle` Module** - Python object serialization
    - Reference: https://docs.python.org/3/library/pickle.html
    - Key: `dump()`, `load()`, `dumps()`, `loads()`

23. **`sqlite3` Module** - DB-API 2.0 interface for SQLite databases
    - Reference: https://docs.python.org/3/library/sqlite3.html
    - Note: May not be applicable in GemStone environment (GemStone has its own persistence)

#### Data Compression and Archiving (Low Priority)

24. **`gzip` Module** - Support for gzip files
    - Reference: https://docs.python.org/3/library/gzip.html

25. **`zipfile` Module** - Work with ZIP archives
    - Reference: https://docs.python.org/3/library/zipfile.html

26. **`tarfile` Module** - Read and write tar archive files
    - Reference: https://docs.python.org/3/library/tarfile.html

#### Generic Operating System Services (High Priority)

27. **`time` Module** - Time-related functions
    - Reference: https://docs.python.org/3/library/time.html
    - Key: `time()`, `sleep()`, `localtime()`, `gmtime()`, `strftime()`, `strptime()`
    - Status: Some tests exist in `tests/Time.py`

28. **`argparse` Module** - Parser for command-line arguments
    - Reference: https://docs.python.org/3/library/argparse.html
    - Key: `ArgumentParser` class

29. **`logging` Module** - Logging facility
    - Reference: https://docs.python.org/3/library/logging.html
    - Key: `Logger`, `Handler`, `Formatter` classes

#### Internet Protocols and Support (Low Priority)

30. **`urllib` Module** - URL handling modules
    - Reference: https://docs.python.org/3/library/urllib.html
    - Note: May need adaptation for GemStone environment

31. **`http` Module** - HTTP modules
    - Reference: https://docs.python.org/3/library/http.html

32. **`email` Module** - Email and MIME handling
    - Reference: https://docs.python.org/3/library/email.html

#### Development Tools (Medium Priority)

33. **`unittest` Module** - Unit testing framework
    - Reference: https://docs.python.org/3/library/unittest.html
    - Key: `TestCase`, `TestSuite`, `TestLoader`, assertions
    - Note: Grail has its own test framework, but unittest compatibility may be useful

34. **`pdb` Module** - Python debugger
    - Reference: https://docs.python.org/3/library/pdb.html
    - Key: `set_trace()`, `breakpoint()` built-in

35. **`doctest` Module** - Test interactive Python examples
    - Reference: https://docs.python.org/3/library/doctest.html

36. **`inspect` Module** - Inspect live objects
    - Reference: https://docs.python.org/3/library/inspect.html
    - Key: `getmembers()`, `signature()`, `getsource()`, `getfile()`

#### Software Packaging and Distribution (Low Priority)

37. **`distutils` / `setuptools`** - Building and distributing Python packages
    - Reference: https://docs.python.org/3/library/distutils.html
    - Note: May not be applicable in GemStone environment

#### Runtime Services (High Priority)

38. **`gc` Module** - Garbage collector interface
    - Reference: https://docs.python.org/3/library/gc.html
    - Key: `collect()`, `get_count()`, `get_stats()`
    - Note: GemStone has its own GC, may need adaptation

39. **`weakref` Module** - Weak references
    - Reference: https://docs.python.org/3/library/weakref.html
    - Key: `ref()`, `WeakValueDictionary`, `WeakKeyDictionary`
    - Status: Documentation exists in `docs/_weakref.txt`

40. **`copy` Module** - Shallow and deep copy operations
    - Reference: https://docs.python.org/3/library/copy.html
    - Key: `copy()`, `deepcopy()`

41. **`pprint` Module** - Data pretty printer
    - Reference: https://docs.python.org/3/library/pprint.html
    - Key: `pprint()`, `pformat()`

#### Language Services (Medium Priority)

42. **`ast` Module** - Abstract Syntax Trees
    - Reference: https://docs.python.org/3/library/ast.html
    - Key: `parse()`, `walk()`, `literal_eval()`
    - Note: Grail uses AST extensively, but may need CPython's `ast` module for compatibility

43. **`keyword` Module** - Python keywords
    - Reference: https://docs.python.org/3/library/keyword.html
    - Key: `iskeyword()`, `kwlist`

44. **`tokenize` Module** - Tokenizer for Python source code
    - Reference: https://docs.python.org/3/library/tokenize.html

45. **`dis` Module** - Disassembler for Python bytecode
    - Reference: https://docs.python.org/3/library/dis.html
    - Note: Grail doesn't use Python bytecode, but may need for compatibility

#### Built-in Modules (Special Cases)

46. **`__builtin__` / `builtins` Module** - Built-in objects
    - Reference: https://docs.python.org/3/library/builtins.html
    - Status: Partially implemented (see `docs/builtins.txt`)

47. **`__main__` Module** - Top-level script environment
    - Reference: https://docs.python.org/3/library/__main__.html
    - Status: Basic support exists

#### Internal Modules (Low Priority - May Not Be Needed)

48. **`_thread` Module** - Threading support
    - Reference: https://docs.python.org/3/library/_thread.html
    - Status: Documentation exists in `docs/_thread.txt`
    - Note: GemStone has its own threading model

49. **`_warnings` Module** - Warning control
    - Reference: https://docs.python.org/3/library/warnings.html
    - Status: Documentation exists in `docs/_warnings.txt`

50. **`_imp` Module** - Import machinery
    - Reference: https://docs.python.org/3/library/importlib.html#module-_imp
    - Note: Internal implementation detail

## Implementation Priority

### Phase 1: Essential for Basic Programs (High Priority)
1. Complete remaining built-in functions (`iter()`, `next()`, `getattr()`, `setattr()`, `delattr()`, `hasattr()`, `vars()`, `id()`, `hash()`, `ascii()`, `format()`, `super()`, `object()`, `slice()`, `reversed()`, `enumerate()`, `zip()`, `filter()`, `compile()`, `eval()`, `exec()`, `__import__()`)
2. `sys` module (core attributes and functions)
3. ✅ `os` module (basic file operations) - **COMPLETED**
4. `io` module (complete file I/O support)
5. `time` module (time operations)
6. `string` module (string constants and utilities)

### Phase 2: Common Usage (Medium Priority)
7. `json` module
8. `datetime` module
9. `collections` module
10. `re` module
11. `itertools` module
12. `functools` module
13. `random` module
14. `pathlib` module
15. `logging` module
16. `argparse` module

### Phase 3: Advanced Features (Lower Priority)
17. Remaining modules as needed based on use cases

## Notes for Implementation

1. **GemStone Environment Considerations**:
   - Some modules that interact with the OS may need adaptation
   - GemStone has its own persistence model (no need for `sqlite3`)
   - GemStone has its own threading model (may need adaptation for `_thread`)
   - File system access may be different in GemStone environment

2. **Type Mapping**:
   - See `docs/CPython_to_GemStone_Type_Mapping.md` for existing type mappings
   - New types may need similar mapping strategies

3. **Testing**:
   - Each module should have corresponding tests in `smalltalk/tests/`
   - Compare behavior with CPython to ensure compatibility
   - Use Python test files in `tests/` directory as reference

4. **Documentation**:
   - Follow the pattern in `docs/Built-in Functions.md` and `docs/Math.md`
   - Track implementation status with checkmarks
   - Reference official Python documentation

5. **Code Organization**:
   - Class definitions go in `smalltalk/classes/_PythonClasses.gs`
   - Method implementations go in separate files (e.g., `smalltalk/classes/sys.gs`)
   - Tests go in `smalltalk/tests/`

## Resources

- [Python 3 Standard Library Index](https://docs.python.org/3/library/index.html)
- [Python 3 Built-in Functions](https://docs.python.org/3/library/functions.html)
- [Python Enhancement Proposals (PEPs)](https://peps.python.org/)
- [CPython Source Code](https://github.com/python/cpython) (for reference implementation)

