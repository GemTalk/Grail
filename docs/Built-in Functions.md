# [Built-in Functions](https://docs.python.org/3/library/functions.html)

Verified 2026-06-12 against the live image (each ✅ row was probed by
calling the builtin via the eval path or an importlib fixture, not by
reading source). ⚠️ = exists but incomplete; see notes below the
table.

| Done | Name             | Description                                                                                                                 |
|:----:|------------------|-----------------------------------------------------------------------------------------------------------------------------|
|  ✅  | `abs()`          | Return the absolute value of a number.                                                                                      |
|      | `aiter()`        | Return an asynchronous iterator for an asynchronous iterable.                                                               |
|  ✅  | `all()`          | Return True if all elements of the iterable are true (or if the iterable is empty).                                         |
|      | `anext()`        | When awaited, return the next item from the given asynchronous iterator, or default if given and the iterator is exhausted. |
|  ✅  | `any()`          | Return True if any element of the iterable is true.                                                                         |
|      | `ascii()`        | As repr(), return a string containing a printable representation of an object, but escape the non-ASCII characters.         |
|  ✅  | `bin()`          | Convert an integer number to a binary string prefixed with "0b".                                                            |
|  ✅  | `bool()`         | Return a boolean value.                                                                                                     |
|      | `breakpoint()`   | Drop into the debugger at the call site.                                                                                    |
|  ✅  | `bytearray()`    | Return a new array of bytes.                                                                                                |
|  ✅  | `bytes()`        | Return a new bytes object.                                                                                                  |
|  ✅  | `callable()`     | Return True if the object argument appears callable.                                                                        |
|  ✅  | `chr()`          | Return the string representing a character whose Unicode code point is the integer.                                         |
|  ✅  | `classmethod()`  | Transform a method into a class method.                                                                                     |
|  ✅  | `compile()`      | Compile the source into a code or AST object.                                                                               |
|  ✅  | `complex()`      | Return a complex number.                                                                                                    |
|  ✅  | `delattr()`      | Delete the named attribute from the given object.                                                                           |
|  ✅  | `dict()`         | Create a new dictionary.                                                                                                    |
|  ✅  | `dir()`          | Return the list of names in the current local scope.                                                                        |
|  ✅  | `divmod()`       | Return a pair of numbers consisting of their quotient and remainder.                                                        |
|  ✅  | `enumerate()`    | Return an enumerate object.                                                                                                 |
|  ✅  | `eval()`         | Evaluate the given source in the context of globals and locals.                                                             |
|  ✅  | `exec()`         | Execute the given source in the context of globals and locals.                                                              |
|      | `filter()`       | Construct an iterator from elements of iterable for which function returns true.                                            |
|  ✅  | `float()`        | Return a floating point number constructed from a number or string.                                                         |
|  ⚠️  | `format()`       | Convert a value to a formatted representation.                                                                              |
|  ✅  | `frozenset()`    | Return a new frozenset object.                                                                                              |
|  ✅  | `getattr()`      | Return the value of the named attribute of object.                                                                          |
|  ✅  | `globals()`      | Return the dictionary implementing the current module namespace.                                                            |
|  ✅  | `hasattr()`      | Return True if the string is the name of one of the object's attributes.                                                    |
|  ✅  | `hash()`         | Return the hash value of the object (if it has one).                                                                        |
|      | `help()`         | Invoke the built-in help system.                                                                                            |
|  ✅  | `hex()`          | Convert an integer number to a lowercase hexadecimal string prefixed with "0x".                                             |
|  ✅  | `id()`           | Return the "identity" of an object.                                                                                         |
|  ✅  | `input()`        | Read a string from standard input.                                                                                          |
|  ✅  | `int()`          | Return an integer object constructed from a number or string.                                                               |
|  ✅  | `isinstance()`   | Return True if the object argument is an instance of the classinfo argument.                                                |
|  ✅  | `issubclass()`   | Return True if class is a subclass of classinfo.                                                                            |
|  ✅  | `iter()`         | Return an iterator object.                                                                                                  |
|  ✅  | `len()`          | Return the length (the number of items) of an object.                                                                       |
|  ✅  | `list()`         | Return a list.                                                                                                              |
|  ✅  | `locals()`       | Update and return a dictionary representing the current local symbol table.                                                 |
|  ✅  | `map()`          | Return an iterator that applies function to every item of iterable.                                                         |
|  ✅  | `max()`          | Return the largest item in an iterable or the largest of two or more arguments.                                             |
|  ✅  | `memoryview()`   | Return a memory view object created from the given argument.                                                                |
|  ✅  | `min()`          | Return the smallest item in an iterable or the smallest of two or more arguments.                                           |
|  ✅  | `next()`         | Retrieve the next item from the iterator by calling its `__next__()` method.                                                |
|  ✅  | `object()`       | Return a new featureless object.                                                                                            |
|  ✅  | `oct()`          | Convert an integer number to an octal string prefixed with "0o".                                                            |
|  ✅  | `open()`         | Open file and return a corresponding file object.                                                                           |
|  ✅  | `ord()`          | Return an integer representing the Unicode code point of that character.                                                    |
|  ✅  | `pow()`          | Return base to the power exp.                                                                                               |
|  ✅  | `print()`        | Print objects to the text stream file.                                                                                      |
|  ✅  | `property()`     | Return a property attribute.                                                                                                |
|  ✅  | `range()`        | Return an immutable sequence type.                                                                                          |
|  ✅  | `repr()`         | Return a string containing a printable representation of an object.                                                         |
|  ✅  | `reversed()`     | Return a reverse iterator.                                                                                                  |
|  ✅  | `round()`        | Return number rounded to ndigits precision after the decimal point.                                                         |
|  ✅  | `set()`          | Return a new set object.                                                                                                    |
|  ✅  | `setattr()`      | Set the named attribute on the given object to the specified value.                                                         |
|  ✅  | `slice()`        | Return a slice object.                                                                                                      |
|  ✅  | `sorted()`       | Return a new sorted list from the items in iterable.                                                                        |
|  ✅  | `staticmethod()` | Transform a method into a static method.                                                                                    |
|  ✅  | `str()`          | Return a string version of object.                                                                                          |
|  ✅  | `sum()`          | Sum start and the items of an iterable.                                                                                     |
|  ✅  | `super()`        | Return a proxy object that delegates method calls to a parent or sibling class.                                             |
|  ✅  | `tuple()`        | Return a tuple.                                                                                                             |
|  ✅  | `type()`         | Return the type of an object.                                                                                               |
|      | `vars()`         | Return the `__dict__` attribute for a module, class, instance, or any other object.                                         |
|  ✅  | `zip()`          | Iterate over several iterables in parallel.                                                                                 |
|  ✅  | `__import__()`   | This function is invoked by the import statement.                                                                           |

## Notes on the qualified rows

- **`format()` / `str.format()` (⚠️)** — placeholders (`{}`, `{0}`,
  `{name}`) and alignment/width specs (`{:<6}`) work.  Type codes are
  silently IGNORED (`format(255, "x")` → `'255'`, not `'ff'`), and a
  precision spec (`"{:.2f}".format(x)`) crashes with an UNCATCHABLE
  Smalltalk-level MessageNotUnderstood (env-1 `#','` sent to
  Unicode7) — a Python `except` cannot recover.
- **`super()`** — zero-arg and explicit `super(Cls, self)` forms work
  via the CallAst rewrite; other shapes (e.g. `super` aliased through
  a local) fall through to NameError (see TODO.md).
- **`delattr()`** — works on real instances.  (Beware testing it on
  `mock.Mock`: Mock's `__getattr__` auto-creates attributes, so
  `hasattr` is always True there.)

## Prioritized implementation list

1. **format-spec mini-language** (`format()` + `str.format` + the
   shared formatter in `string_Formatter.gs`) — HIGH.  Two defects:
   type codes ignored (silent wrong answers) and precision specs
   crash uncatchably.  Numeric specs (`.2f`, `x`, `05d`, `,`) are
   pervasive in real code (logging, reprs, templates).  Largest and
   most impactful remaining builtins item.
2. **`filter()`** — common builtin, absent entirely (bare-name use is
   a compile error).  Straightforward: mirror `map()`'s iterator
   shape; support `filter(None, it)`.
3. **`vars()`** — `vars(obj)` from the instance attribute set (same
   machinery as `dir`+`getattr`); zero-arg `vars()` can reuse the
   `locals()` compile-time rewrite.
4. **`ascii()`** — `repr()` plus non-ASCII escaping; small.
5. **`help()`** — minimal: print the `__doc__` of the argument; only
   worth a stub.
6. **Out of scope for now:** `aiter()`/`anext()` (no async runtime in
   Grail), `breakpoint()` (no debugger bridge; could stub to a no-op
   or topaz pause later).
