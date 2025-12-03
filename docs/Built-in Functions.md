# [Built-in Functions](https://docs.python.org/3/library/functions.html)

| Done | Name             | Description                                                                                                                 | Hrs |
|:----:|------------------|-----------------------------------------------------------------------------------------------------------------------------|:---:|
|  ✅  | `abs()`          | Return the absolute value of a number.                                                                                      |  -  |
|      | `aiter()`        | Return an asynchronous iterator for an asynchronous iterable.                                                               |  4  |
|  ✅  | `all()`          | Return True if all elements of the iterable are true (or if the iterable is empty).                                         |  -  |
|      | `anext()`        | When awaited, return the next item from the given asynchronous iterator, or default if given and the iterator is exhausted. |  4  |
|  ✅  | `any()`          | Return True if any element of the iterable is true.                                                                         |  -  |
|      | `ascii()`        | As repr(), return a string containing a printable representation of an object, but escape the non-ASCII characters.         |  1  |
|  ✅  | `bin()`          | Convert an integer number to a binary string prefixed with "0b".                                                            |  -  |
|  ✅  | `bool()`         | Return a boolean value.                                                                                                     |  -  |
|      | `breakpoint()`   | Drop into the debugger at the call site.                                                                                    |  ?  |
|  ✅  | `bytearray()`    | Return a new array of bytes.                                                                                                |  -  |
|  ✅  | `bytes()`        | Return a new bytes object.                                                                                                  |  -  |
|  ✅  | `callable()`     | Return True if the object argument appears callable.                                                                        |  -  |
|  ✅  | `chr()`          | Return the string representing a character whose Unicode code point is the integer.                                         |  -  |
|      | `classmethod()`  | Transform a method into a class method.                                                                                     |  2  |
|      | `compile()`      | Compile the source into a code or AST object.                                                                               |  4  |
|  ✅  | `complex()`      | Return a complex number.                                                                                                    |  -  |
|      | `delattr()`      | Delete the named attribute from the given object.                                                                           |  2  |
|  ✅  | `dict()`         | Create a new dictionary.                                                                                                    |  -  |
|  ✅  | `dir()`          | Return the list of names in the current local scope.                                                                        |  -  |
|  ✅  | `divmod()`       | Return a pair of numbers consisting of their quotient and remainder.                                                        |  -  |
|      | `enumerate()`    | Return an enumerate object.                                                                                                 |  4  |
|      | `eval()`         | Evaluate the given source in the context of globals and locals.                                                             |  2  |
|      | `exec()`         | Execute the given source in the context of globals and locals.                                                              |  2  |
|      | `filter()`       | Construct an iterator from elements of iterable for which function returns true.                                            |  2  |
|  ✅  | `float()`        | Return a floating point number constructed from a number or string.                                                         |  -  |
|      | `format()`       | Convert a value to a formatted representation.                                                                              |  4  |
|  ✅  | `frozenset()`    | Return a new frozenset object.                                                                                              |  -  |
|      | `getattr()`      | Return the value of the named attribute of object.                                                                          |  1  |
|  ✅  | `globals()`      | Return the dictionary implementing the current module namespace.                                                            |  -  |
|      | `hasattr()`      | Return True if the string is the name of one of the object's attributes.                                                    |  1  |
|      | `hash()`         | Return the hash value of the object (if it has one).                                                                        |  1  |
|      | `help()`         | Invoke the built-in help system.                                                                                            |  4  |
|  ✅  | `hex()`          | Convert an integer number to a lowercase hexadecimal string prefixed with "0x".                                             |  -  |
|      | `id()`           | Return the "identity" of an object.                                                                                         |  1  |
|  ✅  | `input()`        | Read a string from standard input.                                                                                          |  -  |
|  ✅  | `int()`          | Return an integer object constructed from a number or string.                                                               |  -  |
|  ✅  | `isinstance()`   | Return True if the object argument is an instance of the classinfo argument.                                                |  -  |
|  ✅  | `issubclass()`   | Return True if class is a subclass of classinfo.                                                                            |  -  |
|      | `iter()`         | Return an iterator object.                                                                                                  |  2  |
|  ✅  | `len()`          | Return the length (the number of items) of an object.                                                                       |  -  |
|  ✅  | `list()`         | Return a list.                                                                                                              |  -  |
|  ✅  | `locals()`       | Update and return a dictionary representing the current local symbol table.                                                 |  -  |
|  ✅  | `map()`          | Return an iterator that applies function to every item of iterable.                                                         |  -  |
|  ✅  | `max()`          | Return the largest item in an iterable or the largest of two or more arguments.                                             |  -  |
|      | `memoryview()`   | Return a memory view object created from the given argument.                                                                |  4  |
|  ✅  | `min()`          | Return the smallest item in an iterable or the smallest of two or more arguments.                                           |  -  |
|      | `next()`         | Retrieve the next item from the iterator by calling its `__next__()` method.                                                |  2  |
|      | `object()`       | Return a new featureless object.                                                                                            |  1  |
|  ✅  | `oct()`          | Convert an integer number to an octal string prefixed with "0o".                                                            |  -  |
|  ✅  | `open()`         | Open file and return a corresponding file object.                                                                           |  -  |
|  ✅  | `ord()`          | Return an integer representing the Unicode code point of that character.                                                    |  -  |
|  ✅  | `pow()`          | Return base to the power exp.                                                                                               |  -  |
|  ✅  | `print()`        | Print objects to the text stream file.                                                                                      |  -  |
|      | `property()`     | Return a property attribute.                                                                                                |  2  |
|  ✅  | `range()`        | Return an immutable sequence type.                                                                                          |  -  |
|  ✅  | `repr()`         | Return a string containing a printable representation of an object.                                                         |  -  |
|      | `reversed()`     | Return a reverse iterator.                                                                                                  |  1  |
|  ✅  | `round()`        | Return number rounded to ndigits precision after the decimal point.                                                         |  -  |
|  ✅  | `set()`          | Return a new set object.                                                                                                    |  -  |
|      | `setattr()`      | Set the named attribute on the given object to the specified value.                                                         |  2  |
|      | `slice()`        | Return a slice object.                                                                                                      |  2  |
|  ✅  | `sorted()`       | Return a new sorted list from the items in iterable.                                                                        |  -  |
|      | `staticmethod()` | Transform a method into a static method.                                                                                    |  2  |
|  ✅  | `str()`          | Return a string version of object.                                                                                          |  -  |
|  ✅  | `sum()`          | Sum start and the items of an iterable.                                                                                     |  -  |
|      | `super()`        | Return a proxy object that delegates method calls to a parent or sibling class.                                             |  4  |
|  ✅  | `tuple()`        | Return a tuple.                                                                                                             |  -  |
|  ✅  | `type()`         | Return the type of an object.                                                                                               |  -  |
|      | `vars()`         | Return the `__dict__` attribute for a module, class, instance, or any other object.                                         |  2  |
|      | `zip()`          | Iterate over several iterables in parallel.                                                                                 |  4  |
|      | `__import__()`   | This function is invoked by the import statement.                                                                           |  4  |

* This shows as about 76 hours of remaining work (leaving out the `breakpoint()` method).
* About 16 hours remaining on iterables.
* About 8 hours relates to `compile()`, `eval()`, and `exec()`.
