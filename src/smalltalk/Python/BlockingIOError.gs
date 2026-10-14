! ------------------- Superclass check
run
OSError ifNil: [self error: 'OSError is not defined. Check file ordering.'].
%

! ------- OSError subclasses
! ------- BlockingIOError
expectvalue /Class
doit
OSError subclass: 'BlockingIOError'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
BlockingIOError category: 'Grail-Exceptions'
%

! ------------------- characters_written
!
! CPython's BlockingIOError(errno, strerror, characters_written): when the
! THIRD argument is an integer it is the count of characters written before
! the call would have blocked, not a filename -- ``e.characters_written'' is
! 3 for BlockingIOError('a', 'b', 3), ``args'' keeps all three, and there is
! no filename.  Grail unpacked it as OSError does, so the count landed in
! ``filename'' and ``characters_written'' was AttributeError
! (test_exception_hierarchy test_blockingioerror).  Without such an argument
! the attribute is absent, and reading or deleting it is AttributeError, as
! in CPython.

set compile_env: 1

category: 'Grail-Python Attribute Access'
method: BlockingIOError
___args___: anArray
	"OSError's unpacking, except that an integer third argument is
	characters_written: OSError is handed the arguments with that slot empty
	(None, which it reads as no filename), and args is then the whole tuple."

	| size copy |
	size := anArray @env0:isNil ifTrue: [0] ifFalse: [anArray @env0:size].
	((size @env0:between: 3 and: 5)
		@env0:and: [(anArray @env0:at: 3) @env0:isKindOf: Integer]) ifFalse: [
			^ super ___args___: anArray].
	copy := anArray @env0:copy.
	copy @env0:at: 3 put: None.
	super ___args___: copy.
	self @env0:dynamicInstVarAt: #'characters_written' put: (anArray @env0:at: 3).
	args := tuple @env0:withAll: anArray
%

set compile_env: 0
