# CPython Base Classes to GemStone Smalltalk Mapping

## Python Type Hierarchy (CPython 3.14)

### Root of Hierarchy
- **object** → GemStone: **Object**
  - The base class of all Python classes
  - GemStone Object is the root of the Smalltalk hierarchy

### Singleton Types
- **NoneType** (None) → GemStone: **UndefinedObject** (nil)
  - Python's None is equivalent to Smalltalk's nil
  
- **NotImplementedType** (NotImplemented) → GemStone: No direct equivalent
  - Could use a custom singleton or nil
  
- **EllipsisType** (Ellipsis, ...) → GemStone: No direct equivalent
  - Could use a custom singleton

### Numeric Types (numbers.Number)

#### Integral Types (numbers.Integral)
- **int** → GemStone: **Integer** (abstract)
  - Subclasses: **SmallInteger**, **LargeInteger**
  - Python int has unlimited precision like GemStone Integer
  
- **bool** → GemStone: **Boolean** (abstract)
  - Subclasses: **TrueClass**, **FalseClass**
  - Python bool is subclass of int
  - GemStone has True and False as singleton instances

#### Real Types (numbers.Real)
- **float** → GemStone: **Float** (abstract)
  - Subclasses: **SmallDouble**, **SmallFloat**, **BinaryFloat**
  - Both use machine-level double precision

#### Complex Types (numbers.Complex)
- **complex** → GemStone: No built-in equivalent
  - Would need custom implementation
  - GemStone has **Fraction**, **SmallFraction**, **FixedPoint**, **ScaledDecimal**, **SmallScaledDecimal**, **DecimalFloat**

### Sequence Types

#### Immutable Sequences
- **str** → GemStone: **String** (abstract)
  - Subclasses: **Unicode7**, **Unicode16**, **Unicode32**, **Utf8**, **Utf16**
  - Also: **DoubleByteString**, **QuadByteString**, **MultiByteString**
  - GemStone has **InvariantString** for immutable strings
  
- **tuple** → GemStone: **Array** (but mutable in Smalltalk)
  - Could use **InvariantArray** for immutability
  - GemStone Array is variable-sized like Python tuple
  
- **bytes** → GemStone: **ByteArray**
  - Both represent immutable sequences of bytes
  - GemStone also has **CByteArray** for C integration

#### Mutable Sequences
- **list** → GemStone: **Array** or **OrderedCollection**
  - Array is fixed-size but elements are mutable
  - OrderedCollection is dynamically sized
  
- **bytearray** → GemStone: **ByteArray**
  - GemStone ByteArray is mutable

- **range** → GemStone: **Interval**
  - Both represent arithmetic progressions

### Set Types
- **set** → GemStone: **Set** or **IdentitySet**
  - Set uses equality comparison
  - IdentitySet uses identity comparison
  - Also: **UnorderedCollection**, **Bag**, **IdentityBag**
  
- **frozenset** → GemStone: No direct immutable set
  - Could use regular Set and treat as immutable
  - Or **SymbolSet** for symbols

### Mapping Types
- **dict** → GemStone: **Dictionary** or **KeyValueDictionary**
  - **IdentityDictionary** - uses identity for keys
  - **SymbolDictionary** - for symbol keys
  - **StringKeyValueDictionary** - for string keys
  - **IntegerKeyValueDictionary** - for integer keys
  - **SymbolKeyValueDictionary** - for symbol keys
  - **FastIdentityKeyValueDictionary** - optimized identity dict
  - **AbstractDictionary** - abstract superclass

### Exception Hierarchy
- **BaseException** → GemStone: **AbstractException**
  - Python: BaseException → Exception → (specific exceptions)
  - GemStone: AbstractException → Exception → Error → (specific errors)
  
- **Exception** → GemStone: **Exception**
  - Common parent for most exceptions
  
- **ArithmeticError** → GemStone: **NumericError**
  - **FloatingPointError** → **FloatingPointError** or **FloatingPointException**
  - **OverflowError** → No direct equivalent
  - **ZeroDivisionError** → **ZeroDivide**
  
- **AssertionError** → GemStone: No direct equivalent (could use **Error**)
  
- **AttributeError** → GemStone: **MessageNotUnderstood** (similar concept)
  
- **EOFError** → GemStone: **EndOfStream**
  
- **ImportError** → GemStone: No direct equivalent
  
- **LookupError** → GemStone: **LookupError**
  - **IndexError** → **OutOfRange** or **OffsetError**
  - **KeyError** → **LookupError**
  
- **NameError** → GemStone: **NameError**
  
- **OSError** / **IOError** → GemStone: **IOError** or **ExternalError**
  - **SystemCallError** → **SystemCallError**
  
- **RuntimeError** → GemStone: **Error**
  
- **TypeError** → GemStone: **ArgumentTypeError** or **ImproperOperation**
  
- **ValueError** → GemStone: **ArgumentError** or **ImproperOperation**

- **Warning** → GemStone: **Warning** or **Admonition**

### Callable Types

#### Functions
- **function** (user-defined) → GemStone: **BlockClosure** or **ExecBlock**
  - GemStone has **ExecBlock0** through **ExecBlock5** and **ExecBlockN**
  
- **builtin_function** → GemStone: **CompiledMethod** (in system classes)
  
- **method** (bound) → GemStone: Method lookup through class
  - GemStone uses **GsNMethod** for compiled methods

#### Classes and Types
- **type** → GemStone: **Class** or **Metaclass3**
  - **Behavior** - abstract superclass for class behavior
  - **Class** - for regular classes
  - **Metaclass3** - for metaclasses

### Module Type
- **module** → GemStone: **Module** or **SymbolDictionary**
  - GemStone uses **SymbolDictionary** for namespaces
  - **Module** class exists for module management

### Iterator Types
- **iterator** → GemStone: No formal iterator protocol
  - Use blocks with do:, collect:, select:, etc.
  - **Stream** classes for sequential access
  
- **generator** → GemStone: No direct equivalent
  - Could implement with continuations or streams

### I/O Types
- **file** / **TextIOWrapper** → GemStone: **GsFile**
  - **Stream** - abstract superclass
  - **ReadStream**, **WriteStream** for stream operations

### Other Built-in Types
- **slice** → GemStone: No direct equivalent
  - Use integer ranges or intervals
  
- **property** → GemStone: No direct equivalent
  - Use accessor methods
  
- **classmethod** → GemStone: Class-side methods
  
- **staticmethod** → GemStone: Class-side methods
  
- **super** → GemStone: Built into language with `super` keyword

### Internal Types
- **code** → GemStone: **GsNMethod** or **GsNativeCode**
  
- **frame** → GemStone: **VariableContext**
  
- **traceback** → GemStone: **GsStackBuffer** or exception stack

## Summary Table

| Python Type | GemStone Smalltalk Class | Notes |
|-------------|-------------------------|-------|
| object | Object | Root of hierarchy |
| NoneType | UndefinedObject | nil singleton |
| bool | Boolean (TrueClass/FalseClass) | True/False singletons |
| int | Integer (SmallInteger/LargeInteger) | Unlimited precision |
| float | Float (SmallDouble/SmallFloat) | Machine precision |
| complex | (none) | No built-in support |
| str | String (Unicode7/Unicode16/Unicode32) | Unicode support |
| bytes | ByteArray | Immutable in Python, mutable in GemStone |
| bytearray | ByteArray | Mutable |
| list | Array or OrderedCollection | Array fixed-size, OrderedCollection dynamic |
| tuple | Array or InvariantArray | Use InvariantArray for immutability |
| range | Interval | Arithmetic progressions |
| set | Set or IdentitySet | Unordered collections |
| frozenset | Set (treat as immutable) | No immutable variant |
| dict | Dictionary or KeyValueDictionary | Multiple specialized variants |
| type | Class or Metaclass3 | Class objects |
| function | BlockClosure or ExecBlock | Closures and blocks |
| module | Module or SymbolDictionary | Namespaces |
| BaseException | AbstractException | Exception root |
| Exception | Exception | Common exception parent |
| file | GsFile | File I/O |

## Key Differences

1. **Mutability**: Many GemStone collections are mutable where Python has immutable variants (e.g., tuple vs Array)
2. **Numeric Types**: GemStone has more numeric types (Fraction, ScaledDecimal) but lacks complex numbers
3. **Strings**: GemStone has multiple string encodings as separate classes
4. **Dictionaries**: GemStone has many specialized dictionary types for performance
5. **Exceptions**: Different hierarchy structure but similar concepts
6. **Iterators**: Python has formal iterator protocol; GemStone uses blocks and streams
7. **Type System**: GemStone has explicit metaclass hierarchy (Metaclass3)