! ------------------- Superclass check
run
Exception ifNil: [self error: 'Exception is not defined. Check file ordering.'].
%

! ------- SyntaxError
expectvalue /Class
doit
Exception subclass: 'SyntaxError'
  instVarNames: #( msg filename lineno offset text end_lineno end_offset )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SyntaxError comment:
'Python SyntaxError exception.

Instance variables:
  msg - error message
  filename - name of the file with the syntax error
  lineno - line number where the error occurred
  offset - column offset where the error occurred
  text - text of the line with the error
  end_lineno - end line number (Python 3.10+)
  end_offset - end column offset (Python 3.10+)
'
%

expectvalue /Class
doit
SyntaxError category: 'Grail-Exceptions'
%

! ------------------- Location attributes
!
! CPython's SyntaxError unpacks its constructor arguments into the location
! fields: ``SyntaxError(msg)'' sets msg alone, and ``SyntaxError(msg,
! (filename, lineno, offset, text[, end_lineno, end_offset]))'' fills the
! rest.  Grail declared the instVars but nothing ever populated them, so every
! read answered None -- and test.test_traceback's SyntaxError rendering
! (``File "myfile.py", line 100'' above the message) had nothing to render.
!
! Populated in ___args___:, NOT in accessor methods.  ___pyAttrLoad___ reads a
! DECLARED instVar directly, and a named instVar shadows a same-named method,
! so accessors that derived from args were dead code (reads kept answering the
! nil instVar as None).  ___args___: is also the single normalisation point
! every construction path funnels through, so hooking it covers them all.
!
! A Python-level store (``e.lineno = 100'', which test_traceback does) writes
! the same instVar, so an explicit assignment overrides the unpacked value
! exactly as in CPython.

set compile_env: 1

category: 'Grail-Python Attribute Access'
method: SyntaxError
___locElem___: loc at: anIndex
	"Element anIndex (1-based) of the location tuple, or nil when absent.

	``loc'' is a Grail ``tuple'', so index it through the PYTHON protocol
	(__len__ / __getitem__, 0-based) -- Smalltalk's size/at: silently miss.
	Guarded throughout: the location may be nil, None, a short tuple, or not a
	sequence at all, and building an exception must never itself raise.  nil is
	the right answer for absent: a nil instVar reads back as None, which is
	what CPython reports for an unset SyntaxError field."

	| none |
	none := ExecBlock @env0:___pyNone___.
	loc @env0:isNil ifTrue: [^ none].
	(loc == none) ifTrue: [^ none].
	"Comparison and arithmetic go through @env0: as well: in env 1 the numeric
	selectors are Python's (__ge__ / __sub__), so a bare >= or - on a
	SmallInteger is a DNU."
	^ [ ((loc __len__) @env0:>= anIndex)
		ifTrue: [ loc __getitem__: (anIndex @env0:- 1) ]
		ifFalse: [ none ] ] @env0:on: Error do: [:ex | none]
%

category: 'Grail-Python Attribute Access'
method: SyntaxError
___args___: anArray
	"Normalise args as BaseException does, then ALSO unpack CPython's
	SyntaxError location fields from them.  ``anArray'' is a Smalltalk Array of
	the positional constructor arguments (hence @env0:size / @env0:at:); its
	second element, when present, is the Python location tuple."

	| loc none put |
	super ___args___: anArray.
	anArray @env0:isNil ifTrue: [^ self].
	none := ExecBlock @env0:___pyNone___.

	"Write DYNAMIC instVars, not the declared ones.  ___pyAttrLoad___ resolves a
	Python attribute through the dynamic-instVar probe; the class's DECLARED
	instVars are invisible to it, which is why they sat unread for so long.
	Storing the None SINGLETON (never nil) for an absent field matters too: a
	nil dynamic instVar reads back as ABSENT -> AttributeError, whereas CPython
	reports None for an unset SyntaxError field.  A later Python-level store
	(``e.lineno = 100'') overwrites this same slot."
	put := [:nm :v | self @env0:dynamicInstVarAt: nm put: v].

	put value: #'msg' value: (((anArray @env0:size) @env0:>= 1)
		ifTrue: [ anArray @env0:at: 1 ] ifFalse: [ none ]).

	loc := ((anArray @env0:size) @env0:>= 2)
		ifTrue: [ anArray @env0:at: 2 ] ifFalse: [ nil ].
	put value: #'filename'   value: (self ___locElem___: loc at: 1).
	put value: #'lineno'     value: (self ___locElem___: loc at: 2).
	put value: #'offset'     value: (self ___locElem___: loc at: 3).
	put value: #'text'       value: (self ___locElem___: loc at: 4).
	put value: #'end_lineno' value: (self ___locElem___: loc at: 5).
	put value: #'end_offset' value: (self ___locElem___: loc at: 6)
%

! Restore the compile environment this file was entered with.  It declared no
! ``set compile_env:'' before these methods were added, so it inherited env 0
! from the previous file -- and the NEXT file's class-definition doits need it
! back (leaving env 1 set makes ``Exception subclass:...'' a DNU).
set compile_env: 0
