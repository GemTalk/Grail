! ===============================================================================
! builtins_docstrings.gs -- GENERATED, DO NOT EDIT BY HAND.
!
! Regenerate with:
!     python3.14 scripts/generate_builtin_docstrings.py
!
! ``__doc__'' for the builtin FUNCTIONS.  Grail implements them as Smalltalk
! methods, so no FunctionDefAst ran for them and ClassDefAst's
! ___methodDocTable___ -- which captures the docstring of a class-body def --
! has nothing to capture.  The read answered None, and functools.update_wrapper
! copied that None onto every wrapper built around a builtin.
!
! This declares the table by hand for the ``builtins'' module class, the same
! way functools.gs hand-declares ___methodSignatureTable___ for cmp_to_key: a
! module implemented in Smalltalk has to supply the metadata the compiler would
! otherwise have derived from Python source.  BoundMethod >> __doc__ finds it
! through the ordinary superclass walk, so nothing else needs to know these are
! special.
!
! The strings are CPython's own text, transcribed from the running interpreter
! rather than written here.  They are observable behaviour -- test_functools
! asserts ``wrapper.__doc__.startswith('max(')'' after wrapping ``max'' -- so a
! paraphrase would be a different answer that merely looks similar.
!
! Builtin TYPES (dict, list, str, the exceptions) are not here; their __doc__
! resolves through the class, not through a BoundMethod.
! ===============================================================================

! ------------------- Superclass / dictionary check
run
(System myUserProfile symbolList objectNamed: #'Python')
	ifNil: [self error: 'Python dictionary is not defined. Check file ordering.'].
builtins ifNil: [self error: 'builtins is not defined. Check file ordering.'].
%

set compile_env: 1

category: 'Grail-Docstrings'
classmethod: builtins
___methodDocTable___
	"CPython's ``__doc__'' for each builtin function, keyed by the name.
	Read by BoundMethod >> __doc__ through its superclass walk.  GENERATED --
	see the file header."

	^ ((KeyValueDictionary @env0:new)
		@env0:at: 'abs' put: 'Return the absolute value of the argument.';
		@env0:at: 'all' put: 'Return True if bool(x) is True for all values x in the iterable.

If the iterable is empty, return True.';
		@env0:at: 'any' put: 'Return True if bool(x) is True for any x in the iterable.

If the iterable is empty, return False.';
		@env0:at: 'ascii' put: 'Return an ASCII-only representation of an object.

As repr(), return a string containing a printable representation of an
object, but escape the non-ASCII characters in the string returned by
repr() using \\x, \\u or \\U escapes. This generates a string similar
to that returned by repr() in Python 2.';
		@env0:at: 'bin' put: 'Return the binary representation of an integer.

   >>> bin(2796202)
   ''0b1010101010101010101010''';
		@env0:at: 'callable' put: 'Return whether the object is callable (i.e., some kind of function).

Note that classes are callable, as are instances of classes with a
__call__() method.';
		@env0:at: 'chr' put: 'Return a Unicode string of one character with ordinal i; 0 <= i <= 0x10ffff.';
		@env0:at: 'compile' put: 'Compile source into a code object that can be executed by exec() or eval().

The source code may represent a Python module, statement or expression.
The filename will be used for run-time error messages.
The mode must be ''exec'' to compile a module, ''single'' to compile a
single (interactive) statement, or ''eval'' to compile an expression.
The flags argument, if present, controls which future statements influence
the compilation of the code.
The dont_inherit argument, if true, stops the compilation inheriting
the effects of any future statements in effect in the code calling
compile; if absent or false these statements do influence the compilation,
in addition to any features explicitly specified.';
		@env0:at: 'delattr' put: 'Deletes the named attribute from the given object.

delattr(x, ''y'') is equivalent to ``del x.y``';
		@env0:at: 'dir' put: 'dir([object]) -> list of strings

If called without an argument, return the names in the current scope.
Else, return an alphabetized list of names comprising (some of) the attributes
of the given object, and of attributes reachable from it.
If the object supplies a method named __dir__, it will be used; otherwise
the default dir() logic is used and returns:
  for a module object: the module''s attributes.
  for a class object:  its attributes, and recursively the attributes
    of its bases.
  for any other object: its attributes, its class''s attributes, and
    recursively the attributes of its class''s base classes.';
		@env0:at: 'divmod' put: 'Return the tuple (x//y, x%y).  Invariant: div*y + mod == x.';
		@env0:at: 'enumerate' put: 'Return an enumerate object.

  iterable
    an object supporting iteration

The enumerate object yields pairs containing a count (from start, which
defaults to zero) and a value yielded by the iterable argument.

enumerate is useful for obtaining an indexed list:
    (0, seq[0]), (1, seq[1]), (2, seq[2]), ...';
		@env0:at: 'eval' put: 'Evaluate the given source in the context of globals and locals.

The source may be a string representing a Python expression
or a code object as returned by compile().
The globals must be a dictionary and locals can be any mapping,
defaulting to the current globals and locals.
If only globals is given, locals defaults to it.';
		@env0:at: 'exec' put: 'Execute the given source in the context of globals and locals.

The source may be a string representing one or more Python statements
or a code object as returned by compile().
The globals must be a dictionary and locals can be any mapping,
defaulting to the current globals and locals.
If only globals is given, locals defaults to it.
The closure must be a tuple of cellvars, and can only be used
when source is a code object requiring exactly that many cellvars.';
		@env0:at: 'filter' put: 'Return an iterator yielding those items of iterable for which function(item)
is true. If function is None, return the items that are true.';
		@env0:at: 'format' put: 'Return type(value).__format__(value, format_spec)

Many built-in types implement format_spec according to the
Format Specification Mini-language. See help(''FORMATTING'').

If type(value) does not supply a method named __format__
and format_spec is empty, then str(value) is returned.
See also help(''SPECIALMETHODS'').';
		@env0:at: 'getattr' put: 'getattr(object, name[, default]) -> value

Get a named attribute from an object; getattr(x, ''y'') is equivalent to x.y.
When a default argument is given, it is returned when the attribute doesn''t
exist; without it, an exception is raised in that case.';
		@env0:at: 'hasattr' put: 'Return whether the object has an attribute with the given name.

This is done by calling getattr(obj, name) and catching AttributeError.';
		@env0:at: 'hash' put: 'Return the hash value for the given object.

Two objects that compare equal must also have the same hash value, but the
reverse is not necessarily true.';
		@env0:at: 'help' put: 'Define the builtin ''help''.

This is a wrapper around pydoc.help that provides a helpful message
when ''help'' is typed at the Python interactive prompt.

Calling help() at the Python prompt starts an interactive help session.
Calling help(thing) prints help for the python object ''thing''.
';
		@env0:at: 'hex' put: 'Return the hexadecimal representation of an integer.

   >>> hex(12648430)
   ''0xc0ffee''';
		@env0:at: 'id' put: 'Return the identity of an object.

This is guaranteed to be unique among simultaneously existing objects.
(CPython uses the object''s memory address.)';
		@env0:at: 'input' put: 'Read a string from standard input.  The trailing newline is stripped.

The prompt string, if given, is printed to standard output without a
trailing newline before reading input.

If the user hits EOF (*nix: Ctrl-D, Windows: Ctrl-Z+Return), raise EOFError.
On *nix systems, readline is used if available.';
		@env0:at: 'isinstance' put: 'Return whether an object is an instance of a class or of a subclass thereof.

A tuple, as in ``isinstance(x, (A, B, ...))``, may be given as the target to
check against. This is equivalent to ``isinstance(x, A) or isinstance(x, B)
or ...`` etc.';
		@env0:at: 'issubclass' put: 'Return whether ''cls'' is derived from another class or is the same class.

A tuple, as in ``issubclass(x, (A, B, ...))``, may be given as the target to
check against. This is equivalent to ``issubclass(x, A) or issubclass(x, B)
or ...``.';
		@env0:at: 'iter' put: 'iter(iterable) -> iterator
iter(callable, sentinel) -> iterator

Get an iterator from an object.  In the first form, the argument must
supply its own iterator, or be a sequence.
In the second form, the callable is called until it returns the sentinel.';
		@env0:at: 'len' put: 'Return the number of items in a container.';
		@env0:at: 'map' put: 'Make an iterator that computes the function using arguments from
each of the iterables.  Stops when the shortest iterable is exhausted.

If strict is true and one of the arguments is exhausted before the others,
raise a ValueError.';
		@env0:at: 'max' put: 'max(iterable, *[, default=obj, key=func]) -> value
max(arg1, arg2, *args, *[, key=func]) -> value

With a single iterable argument, return its biggest item. The
default keyword-only argument specifies an object to return if
the provided iterable is empty.
With two or more positional arguments, return the largest argument.';
		@env0:at: 'min' put: 'min(iterable, *[, default=obj, key=func]) -> value
min(arg1, arg2, *args, *[, key=func]) -> value

With a single iterable argument, return its smallest item. The
default keyword-only argument specifies an object to return if
the provided iterable is empty.
With two or more positional arguments, return the smallest argument.';
		@env0:at: 'next' put: 'next(iterator[, default])

Return the next item from the iterator. If default is given and the iterator
is exhausted, it is returned instead of raising StopIteration.';
		@env0:at: 'oct' put: 'Return the octal representation of an integer.

   >>> oct(342391)
   ''0o1234567''';
		@env0:at: 'open' put: 'Open file and return a stream.  Raise OSError upon failure.

file is either a text or byte string giving the name (and the path
if the file isn''t in the current working directory) of the file to
be opened or an integer file descriptor of the file to be
wrapped. (If a file descriptor is given, it is closed when the
returned I/O object is closed, unless closefd is set to False.)

mode is an optional string that specifies the mode in which the file
is opened. It defaults to ''r'' which means open for reading in text
mode.  Other common values are ''w'' for writing (truncating the file if
it already exists), ''x'' for creating and writing to a new file, and
''a'' for appending (which on some Unix systems, means that all writes
append to the end of the file regardless of the current seek position).
In text mode, if encoding is not specified the encoding used is platform
dependent: locale.getencoding() is called to get the current locale encoding.
(For reading and writing raw bytes use binary mode and leave encoding
unspecified.) The available modes are:

========= ===============================================================
Character Meaning
--------- ---------------------------------------------------------------
''r''       open for reading (default)
''w''       open for writing, truncating the file first
''x''       create a new file and open it for writing
''a''       open for writing, appending to the end of the file if it exists
''b''       binary mode
''t''       text mode (default)
''+''       open a disk file for updating (reading and writing)
========= ===============================================================

The default mode is ''rt'' (open for reading text). For binary random
access, the mode ''w+b'' opens and truncates the file to 0 bytes, while
''r+b'' opens the file without truncation. The ''x'' mode implies ''w'' and
raises an `FileExistsError` if the file already exists.

Python distinguishes between files opened in binary and text modes,
even when the underlying operating system doesn''t. Files opened in
binary mode (appending ''b'' to the mode argument) return contents as
bytes objects without any decoding. In text mode (the default, or when
''t'' is appended to the mode argument), the contents of the file are
returned as strings, the bytes having been first decoded using a
platform-dependent encoding or using the specified encoding if given.

buffering is an optional integer used to set the buffering policy.
Pass 0 to switch buffering off (only allowed in binary mode), 1 to select
line buffering (only usable in text mode), and an integer > 1 to indicate
the size of a fixed-size chunk buffer.  When no buffering argument is
given, the default buffering policy works as follows:

* Binary files are buffered in fixed-size chunks; the size of the buffer
 is max(min(blocksize, 8 MiB), DEFAULT_BUFFER_SIZE)
 when the device block size is available.
 On most systems, the buffer will typically be 128 kilobytes long.

* "Interactive" text files (files for which isatty() returns True)
  use line buffering.  Other text files use the policy described above
  for binary files.

encoding is the name of the encoding used to decode or encode the
file. This should only be used in text mode. The default encoding is
platform dependent, but any encoding supported by Python can be
passed.  See the codecs module for the list of supported encodings.

errors is an optional string that specifies how encoding errors are to
be handled---this argument should not be used in binary mode. Pass
''strict'' to raise a ValueError exception if there is an encoding error
(the default of None has the same effect), or pass ''ignore'' to ignore
errors. (Note that ignoring encoding errors can lead to data loss.)
See the documentation for codecs.register or run ''help(codecs.Codec)''
for a list of the permitted encoding error strings.

newline controls how universal newlines works (it only applies to text
mode). It can be None, '''', ''\n'', ''\r'', and ''\r\n''.  It works as
follows:

* On input, if newline is None, universal newlines mode is
  enabled. Lines in the input can end in ''\n'', ''\r'', or ''\r\n'', and
  these are translated into ''\n'' before being returned to the
  caller. If it is '''', universal newline mode is enabled, but line
  endings are returned to the caller untranslated. If it has any of
  the other legal values, input lines are only terminated by the given
  string, and the line ending is returned to the caller untranslated.

* On output, if newline is None, any ''\n'' characters written are
  translated to the system default line separator, os.linesep. If
  newline is '''' or ''\n'', no translation takes place. If newline is any
  of the other legal values, any ''\n'' characters written are translated
  to the given string.

If closefd is False, the underlying file descriptor will be kept open
when the file is closed. This does not work when a file name is given
and must be True in that case.

A custom opener can be used by passing a callable as *opener*. The
underlying file descriptor for the file object is then obtained by
calling *opener* with (*file*, *flags*). *opener* must return an open
file descriptor (passing os.open as *opener* results in functionality
similar to passing None).

open() returns a file object whose type depends on the mode, and
through which the standard file operations such as reading and writing
are performed. When open() is used to open a file in a text mode (''w'',
''r'', ''wt'', ''rt'', etc.), it returns a TextIOWrapper. When used to open
a file in a binary mode, the returned class varies: in read binary
mode, it returns a BufferedReader; in write binary and append binary
modes, it returns a BufferedWriter, and in read/write mode, it returns
a BufferedRandom.

It is also possible to use a string or bytearray as a file for both
reading and writing. For strings StringIO can be used like a file
opened in a text mode, and for bytes a BytesIO can be used like a file
opened in a binary mode.';
		@env0:at: 'ord' put: 'Return the ordinal value of a character.

If the argument is a one-character string, return the Unicode code
point of that character.

If the argument is a bytes or bytearray object of length 1, return its
single byte value.';
		@env0:at: 'pow' put: 'Equivalent to base**exp with 2 arguments or base**exp % mod with 3 arguments

Some types, such as ints, are able to use a more efficient algorithm when
invoked using the three argument form.';
		@env0:at: 'print' put: 'Prints the values to a stream, or to sys.stdout by default.

  sep
    string inserted between values, default a space.
  end
    string appended after the last value, default a newline.
  file
    a file-like object (stream); defaults to the current sys.stdout.
  flush
    whether to forcibly flush the stream.';
		@env0:at: 'repr' put: 'Return the canonical string representation of the object.

For many object types, including most builtins, eval(repr(obj)) == obj.';
		@env0:at: 'reversed' put: 'Return a reverse iterator over the values of the given sequence.';
		@env0:at: 'round' put: 'Round a number to a given precision in decimal digits.

The return value is an integer if ndigits is omitted or None.  Otherwise
the return value has the same type as the number.  ndigits may be negative.';
		@env0:at: 'setattr' put: 'Sets the named attribute on the given object to the specified value.

setattr(x, ''y'', v) is equivalent to ``x.y = v``';
		@env0:at: 'sorted' put: 'Return a new list containing all items from the iterable in ascending order.

A custom key function can be supplied to customize the sort order, and the
reverse flag can be set to request the result in descending order.';
		@env0:at: 'sum' put: 'Return the sum of a ''start'' value (default: 0) plus an iterable of numbers

When the iterable is empty, return the start value.
This function is intended specifically for use with numeric values and may
reject non-numeric types.';
		@env0:at: 'type' put: 'type(object) -> the object''s type
type(name, bases, dict, **kwds) -> a new type';
		@env0:at: 'vars' put: 'vars([object]) -> dictionary

Without arguments, equivalent to locals().
With an argument, equivalent to object.__dict__.';
		@env0:at: 'zip' put: 'The zip object yields n-length tuples, where n is the number of iterables
passed as positional arguments to zip().  The i-th element in every tuple
comes from the i-th iterable argument to zip().  This continues until the
shortest argument is exhausted.

If strict is true and one of the arguments is exhausted before the others,
raise a ValueError.

   >>> list(zip(''abcdefg'', range(3), range(4)))
   [(''a'', 0, 0), (''b'', 1, 1), (''c'', 2, 2)]';
		@env0:yourself)
%

set compile_env: 0
