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
! Two details that look like edge cases but are observable behaviour:
!   * Arity gates the whole thing.  One argument (``OSError('msg')'') or more
!     than five leaves every field None and args untouched; only 2..5 unpack.
!   * args is TRUNCATED to (errno, strerror) once a filename is supplied --
!     ``OSError(0, 's', 'f').args'' is ``(0, 's')'', not the full triple.
!
! Written as DYNAMIC instVars for the reason recorded on SyntaxError
! ___args___:: ___pyAttrLoad___ resolves a Python attribute through the
! dynamic-instVar probe, so the DECLARED instVars of the same name are
! invisible to it.  Storing the None SINGLETON (never nil) matters too: a nil
! dynamic instVar reads back as ABSENT -> AttributeError, whereas CPython
! reports None for an unset field.

set compile_env: 1

category: 'Grail-Python Attribute Access'
method: OSError
___args___: anArray
	"Normalise args as BaseException does, then ALSO unpack CPython's OSError
	fields from them.  ``anArray'' is a Smalltalk Array of the positional
	constructor arguments (hence @env0:size / @env0:at:)."

	| none put size elem |
	anArray @env0:isNil ifTrue: [^ super ___args___: anArray].
	size := anArray @env0:size.
	"Outside 2..5 CPython does no unpacking at all and keeps args whole."
	((size @env0:< 2) @env0:or: [size @env0:> 5]) ifTrue: [
		^ super ___args___: anArray].

	"With a filename present, CPython reports only (errno, strerror) as args."
	super ___args___: ((size @env0:>= 3)
		ifTrue: [ anArray @env0:copyFrom: 1 to: 2 ]
		ifFalse: [ anArray ]).

	none := ExecBlock @env0:___pyNone___.
	put := [:nm :v | self @env0:dynamicInstVarAt: nm put: v].
	elem := [:i | (size @env0:>= i)
		ifTrue: [ anArray @env0:at: i ] ifFalse: [ none ]].

	put value: #'errno'    value: (elem value: 1).
	put value: #'strerror' value: (elem value: 2).
	put value: #'filename' value: (elem value: 3).
	"args 4 is winerror, which is Windows-only and not exposed here."
	put value: #'filename2' value: (elem value: 5)
%

! Restore the compile environment this file was entered with: the NEXT file's
! class-definition doits need env 0 (leaving env 1 set makes
! ``Exception subclass:...'' a DNU).
set compile_env: 0
