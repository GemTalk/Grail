! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- OSError (needs instance variables, so create as Python class)
expectvalue /Class
doit
Exception subclass: 'OSError'
  instVarNames: #( errno strerror filename filename2 )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
OSError comment:
'Python OSError exception.

Instance variables:
  errno - error number
  strerror - error message string
  filename - name of the file involved (if any)
  filename2 - second filename (for operations involving two files)
'
%

expectvalue /Class
doit
OSError category: 'Grail-Exceptions'
%

! ------------------- errno / strerror / filename
!
! CPython's OSError unpacks 2..5 positional arguments into these fields:
! ``OSError(errno, strerror[, filename[, winerror[, filename2]]])''.  Grail
! declared the instVars but nothing populated them, so ``e.errno'' raised
! AttributeError -- and test.test_gettext, which asserts errno/strerror/
! filename on the OSError that GNUTranslations raises for a bad .mo file,
! could not check the error it had correctly raised.
!
! The unpacking is on OSError itself, so all 13 subclasses (FileNotFoundError,
! PermissionError, ...) inherit it, exactly as in CPython.
!
! Three details that look like edge cases but are observable behaviour, all
! three MEASURED against CPython 3.14.6 rather than read off the C source:
!
!   * Arity gates the whole thing.  One argument (``OSError('msg')'') or more
!     than five leaves every field unset and args untouched; only 2..5 unpack.
!     UNSET now reads back as None rather than raising -- see ``errno'' below,
!     which is the half of this that was missing.
!   * filename is kept only when one was actually SUPPLIED.  CPython's
!     oserror_init tests ``filename && filename != Py_None'', and filename2 is
!     kept only INSIDE that test, so ``OSError(2, 'm', None, None, 'g')''
!     reports NEITHER -- filename2 is not consulted when there is no filename.
!   * args is truncated to (errno, strerror) by that SAME test, not by arity:
!     ``OSError(2, 's', 'f').args'' is ``(2, 's')'' but
!     ``OSError(2, 's', None).args'' is the whole 3-tuple.  Truncating on arity
!     alone lost the None case.
!
! Written as DYNAMIC instVars for the reason recorded on SyntaxError
! ___args___:: ___pyAttrLoad___ resolves a Python attribute through the
! dynamic-instVar probe, so the DECLARED instVars of the same name are
! invisible to it.  ABSENCE is then load-bearing twice over: it is what tells
! ``errno'' to answer None and ``__str__'' that there is no ``[Errno n]'' to
! report.  That is why nothing is stored outside 2..5 arguments, and why the
! None SINGLETON is stored (never nil) for a field that WAS supplied as None --
! ``OSError(2, None)'' stringifies to ``[Errno 2] None'' in CPython, because
! the C code tests the slot for non-NULL rather than for truth.

set compile_env: 1

category: 'Grail-Python Attribute Access'
method: OSError
___args___: anArray
	"Normalise args as BaseException does, then ALSO unpack CPython's OSError
	fields from them.  ``anArray'' is a Smalltalk Array of the positional
	constructor arguments (hence @env0:size / @env0:at:)."

	| none put size elem fname f2 |
	anArray @env0:isNil ifTrue: [^ super ___args___: anArray].
	size := anArray @env0:size.
	"Outside 2..5 CPython does no unpacking at all and keeps args whole."
	((size @env0:< 2) @env0:or: [size @env0:> 5]) ifTrue: [
		^ super ___args___: anArray].

	none := ExecBlock @env0:___pyNone___.
	put := [:nm :v | self @env0:dynamicInstVarAt: nm put: v].
	elem := [:i | (size @env0:>= i)
		ifTrue: [ anArray @env0:at: i ] ifFalse: [ none ]].

	put value: #'errno'    value: (elem value: 1).
	put value: #'strerror' value: (elem value: 2).

	"No filename supplied: keep args whole and leave filename/filename2 unset.
	CPython decides both from this one test -- see the header."
	fname := elem value: 3.
	(fname @env0:== none) ifTrue: [^ super ___args___: anArray].

	put value: #'filename' value: fname.
	"args 4 is winerror, which is Windows-only and not exposed here."
	f2 := elem value: 5.
	(f2 @env0:== none) ifFalse: [put value: #'filename2' value: f2].
	^ super ___args___: (anArray @env0:copyFrom: 1 to: 2)
%

category: 'Grail-Private'
method: OSError
___osFieldAt___: aName
	"The stored value of one unpacked field, or nil when the field was never
	stored.  ``dynamicInstVarAt:'' RAISES for an absent name rather than
	answering nil (the reason BaseException >> __cause__ wraps it the same
	way), and absent is a case this class needs to tell apart from None."

	^ [self @env0:dynamicInstVarAt: aName]
		@env0:on: AbstractException do: [:e | e @env0:return: nil]
%

category: 'Grail-Python Attribute Access'
method: OSError
errno
	"None when the constructor was not given CPython's (errno, strerror) form.

	THE DEFAULT IS THE POINT, and it was missing.  The four fields are stored
	as dynamic instVars only when they are supplied, and ___pyAttrLoad___
	probes dynamic instVars BEFORE methods, so this accessor runs exactly in
	the case that used to raise AttributeError.

	It is not a rare case: every OSError Grail's socket layer raises is the
	ONE-argument form (``[Errno 9] Bad file descriptor'' as a single message
	string), so ``except OSError as e:'' followed by ``e.errno in (EAGAIN,
	EWOULDBLOCK)'' -- which is how the VENDORED CPython socket.py decides that
	a non-blocking read should be retried rather than reported -- could not run
	at all.  It raised AttributeError from inside the handler."

	^ (self ___osFieldAt___: #'errno') @env0:ifNil: [None]
%

category: 'Grail-Python Attribute Access'
method: OSError
strerror
	"None when not supplied; see ``errno''."

	^ (self ___osFieldAt___: #'strerror') @env0:ifNil: [None]
%

category: 'Grail-Python Attribute Access'
method: OSError
filename
	"None when not supplied; see ``errno''."

	^ (self ___osFieldAt___: #'filename') @env0:ifNil: [None]
%

category: 'Grail-Python Attribute Access'
method: OSError
filename2
	"None when not supplied; see ``errno''."

	^ (self ___osFieldAt___: #'filename2') @env0:ifNil: [None]
%

category: 'Grail-String Representation'
method: OSError
__str__
	"CPython's OSError_str: ``[Errno n] strerror'', extended with ``: filename''
	and `` -> filename2'' when those were supplied, and falling back to
	BaseException's rendering when the (errno, strerror) form was not used.

	Grail inherited BaseException's ``str(self.args)'', which renders a
	two-argument exception as the TUPLE: ``(35, 'Resource temporarily
	unavailable')'' where CPython says ``[Errno 35] Resource temporarily
	unavailable''.  That is the shape of every errno-carrying OSError, so the
	difference surfaced anywhere a caught OSError was printed or compared.

	The filename parts use Python repr, not str -- CPython formats them with
	%R, so the name arrives quoted."

	| e f f2 b stream |
	e := self ___osFieldAt___: #'errno'.
	"Absent, not None: the errno form was not used at all."
	e @env0:isNil ifTrue: [^ super __str__].

	b := builtins instance.
	stream := AppendStream @env0:on: (Unicode7 ___new___).
	stream @env0:nextPutAll: '[Errno '.
	stream @env0:nextPutAll: ((str __new__: e) @env0:asString).
	stream @env0:nextPutAll: '] '.
	stream @env0:nextPutAll:
		((str __new__: (self ___osFieldAt___: #'strerror')) @env0:asString).

	f := self ___osFieldAt___: #'filename'.
	f @env0:isNil ifTrue: [^ stream @env0:contents].
	stream @env0:nextPutAll: ': '.
	stream @env0:nextPutAll: ((b repr: f) @env0:asString).

	f2 := self ___osFieldAt___: #'filename2'.
	f2 @env0:isNil ifTrue: [^ stream @env0:contents].
	stream @env0:nextPutAll: ' -> '.
	stream @env0:nextPutAll: ((b repr: f2) @env0:asString).
	^ stream @env0:contents
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! consults it through an env-0 ``respondsTo:'', so an env-1 definition is
! invisible to the probe and the hook silently does nothing.
set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: OSError
___pythonValueAttrs___
	"``e.errno'', not ``e.errno()''.  The four accessors above are DEFAULTS for
	fields that were never stored, and without this hook ___pyAttrLoad___
	answers a BoundMethod for them -- which is truthy, so ``if e.errno:'' takes
	the wrong branch and every comparison against an errno silently fails
	instead of erroring.

	The names are only reached when no dynamic instVar of the same name exists
	(dynamic instVars are probed first), so listing them here does not shadow a
	supplied value.

	Extends the inherited set (args / __traceback__ / the chaining trio) rather
	than replacing it; BaseException builds a fresh IdentitySet per call, so
	adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'errno';
		add: #'strerror';
		add: #'filename';
		add: #'filename2';
		yourself
%

! Restore the compile environment this file was entered with: the NEXT file's
! class-definition doits need env 0 (leaving env 1 set makes
! ``Exception subclass:...'' a DNU).
set compile_env: 0
