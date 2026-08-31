! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- ImportError
expectvalue /Class
doit
Exception subclass: 'ImportError'
  instVarNames: #( name path msg )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
ImportError comment:
'Python ImportError exception.

Instance variables:
  name - name of the module that failed to import
  path - path to the module file
  msg - error message
'
%

expectvalue /Class
doit
ImportError category: 'Grail-Exceptions'
%

! ------------------- CPython's ``from X import Y'' miss
set compile_env: 0

category: 'Grail-Import Errors'
classmethod: ImportError
___signalCannotImportName___: aName from: aModuleName path: aPath
	"Raise CPython's ``from PKG import name'' error: the name is neither an
	attribute of the package nor a submodule of it.

	CPython's wording and attributes, both of which matter.  The message is
	``cannot import name 'X' from 'PKG' (/path/to/pkg.py)'' -- with
	``(unknown location)'' when the path is not known -- and the exception carries
	``name'' (the package), ``name_from'' (the missing name) and ``path''.
	traceback.py reads name_from to offer ``Did you mean: ...?'', and stdlib code
	reads name/path.

	Grail raised ModuleNotFoundError here.  That was deliberate -- an ImportError
	SUBCLASS, so ``try: from . import x except ImportError: pass'' hooks still
	worked -- but it reported a missing MODULE for what is really a missing NAME,
	and its message named ``PKG.x'' as the module.  ImportError itself keeps those
	hooks working (it is the base class) while saying what actually happened."

	| instance msg |
	msg := 'cannot import name ''' @env0:, aName @env0:asString @env0:,
		''' from ''' @env0:, aModuleName @env0:asString @env0:, ''' (' @env0:,
		(aPath isNil ifTrue: ['unknown location'] ifFalse: [aPath @env0:asString])
		@env0:, ')'.
	instance := self @env1:___new___.
	instance @env1:___args___: { msg }.
	instance @env0:dynamicInstVarAt: #'name' put: aModuleName @env0:asString.
	instance @env0:dynamicInstVarAt: #'name_from' put: aName @env0:asString.
	aPath isNil ifFalse: [
		instance @env0:dynamicInstVarAt: #'path' put: aPath @env0:asString].
	^ instance @env1:___signal___: msg
%

! ------------------- A C extension that would not load
set compile_env: 0

category: 'Grail-Import Errors'
classmethod: ImportError
___signalExtensionLoadFailed___: rawText name: moduleName path: aPath
	"Raise ImportError for a .so C extension that could not be loaded, from the
	raw text a GrailShimError carried out of src/c/shim/cpython.cc.

	WHY THIS EXISTS.  The shim reports every load failure as a GrailShimError --
	a Smalltalk Error, a SIBLING of Grail's Python BaseException, not a
	subclass.  Python ``except ImportError'' therefore cannot see it, no Python
	handler runs, and the failure escapes as an uncatchable Smalltalk error that
	takes the session down.  That is not a corner case: markupsafe and jinja2
	both guard their C speedups with ``try: from ._speedups import ... except
	ImportError:'' and ship a working pure-Python fallback, so under CPython a
	venv whose .so cannot load is INVISIBLE and under Grail it was fatal.  See
	docs/Issues.md, ``A failed dlopen killed the session''.

	FOUR SHIM TEXTS, all measured (see the same Issues.md section), all of them
	an ImportError here:

	  ``dlopen failed: <dlerror>''            -- the .so exists but will not
	      load: a CPython symbol the shim does not export, a wrong-architecture
	      slice, a file that is not Mach-O at all.  The message becomes the
	      dlerror text VERBATIM, which is exactly what CPython says.
	  ``Symbol not found: PyInit_X in <p>''   -- it loaded, but defines no init
	      function.  CPython's wording is ``dynamic module does not define
	      module export function (PyInit_X)''.
	  ``Module init failed: X''               -- PyInit_X answered NULL.
	  ``Module exec failed: X''               -- a Py_mod_exec slot failed.

	The last two are where Grail and CPython part company, deliberately.
	CPython raises SystemError for an init that answers NULL *without* setting
	an exception, and re-raises the real exception when one was set.  Grail's
	shim cannot tell those apart -- both arrive as a NULL return with no error
	object -- and the commoner CPython outcome of the pair is an ImportError
	raised by the init itself.  Reporting ImportError keeps the graceful-
	degradation guards working; the text still says which of the two happened.

	Anything the shim says that is NOT one of the four is passed through
	unchanged rather than guessed at, so a new shim message cannot be silently
	relabelled as something it is not.

	The exception carries ``name'' and ``path'' like CPython's, which is what
	lets ``except ImportError as e: ... e.name ...'' work."

	| instance msg tail |
	msg := nil.
	tail := self ___textOf: rawText after: 'dlopen failed: '.
	tail isNil ifFalse: [msg := tail].
	msg isNil ifTrue: [
		tail := self ___textOf: rawText after: 'Symbol not found: '.
		tail isNil ifFalse: [
			msg := 'dynamic module does not define module export function (',
				(self ___textOf: tail before: ' in '), ')']].
	msg isNil ifTrue: [
		tail := self ___textOf: rawText after: 'Module init failed: '.
		tail isNil ifFalse: [
			msg := 'initialization of ', tail,
				' failed without raising an exception']].
	msg isNil ifTrue: [
		tail := self ___textOf: rawText after: 'Module exec failed: '.
		tail isNil ifFalse: [
			msg := 'execution of extension module ', tail, ' failed']].
	msg isNil ifTrue: [
		(rawText isNil or: [rawText isEmpty])
			ifTrue: [msg := 'cannot load extension module ''',
				moduleName asString, '''']
			ifFalse: [msg := rawText]].
	instance := self @env1:___new___.
	instance @env1:___args___: { msg }.
	instance dynamicInstVarAt: #'name' put: moduleName asString.
	aPath isNil ifFalse: [
		instance dynamicInstVarAt: #'path' put: aPath asString].
	^ instance @env1:___signal___: msg
%

category: 'Grail-Import Errors'
classmethod: ImportError
___textOf: aString after: aPrefix
	"The remainder of aString after aPrefix, or nil when aString is nil or does
	not start with aPrefix.  Plain String sends, not Python str sends: this runs
	in env 0 on the raw messageText of a Smalltalk Error."

	aString isNil ifTrue: [^ nil].
	aString size < aPrefix size ifTrue: [^ nil].
	(aString copyFrom: 1 to: aPrefix size) = aPrefix ifFalse: [^ nil].
	^ aString copyFrom: aPrefix size + 1 to: aString size
%

category: 'Grail-Import Errors'
classmethod: ImportError
___textOf: aString before: aMarker
	"The part of aString before the first occurrence of aMarker, or all of
	aString when aMarker does not occur."

	| idx |
	aString isNil ifTrue: [^ nil].
	idx := aString indexOfSubCollection: aMarker startingAt: 1.
	idx = 0 ifTrue: [^ aString].
	^ aString copyFrom: 1 to: idx - 1
%

! ------------------- CPython's ImportError.msg
set compile_env: 1

category: 'Grail-Import Errors'
method: ImportError
___args___: anArray
	"Also publish CPython's ``msg'' attribute, which every ImportError has.

	CPython's ImportError_init sets ``msg'' to the single positional argument
	when there is exactly one, and leaves it None otherwise -- so ``e.msg'' is
	ALWAYS readable on an ImportError, and real code reads it.  numpy's
	_core/__init__.py opens its ImportError handler with

	    if exc.msg == ''cannot load module more than once per process'':

	which under Grail raised ``AttributeError: 'ImportError' object has no
	attribute 'msg''' -- a second, quieter failure hiding behind the first, and
	only visible once a failed dlopen stopped killing the session outright.

	Done in ___args___: rather than in one constructor so it holds for EVERY
	path that builds an ImportError or a subclass of it (ModuleNotFoundError
	included), not just the two class-side signallers in this file."

	super ___args___: anArray.
	self @env0:___setMsgFrom___: anArray
%

set compile_env: 0

category: 'Grail-Import Errors'
method: ImportError
___setMsgFrom___: anArray
	"Set the ``msg'' attribute from the positional constructor arguments, using
	CPython's rule: the single argument when there is exactly one, None
	otherwise.  Split out of ___args___: because that method is env 1 and every
	send here -- ``size'', ``='', ``at:'' -- is meant as plain Smalltalk."

	| val |
	val := None.
	(anArray notNil and: [anArray size = 1])
		ifTrue: [val := anArray at: 1].
	self dynamicInstVarAt: #'msg' put: val
%

set compile_env: 0
