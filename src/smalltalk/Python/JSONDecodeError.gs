set compile_env: 0

! ------------------- Superclass check
run
ValueError ifNil: [self error: 'ValueError is not defined. Check file ordering.'].
%

! ------- JSONDecodeError (raised by the json module)
expectvalue /Class
doit
ValueError subclass: 'JSONDecodeError'
  instVarNames: #( msg doc pos lineno colno )
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
JSONDecodeError comment:
'Python ``json.JSONDecodeError`` -- ValueError subclass raised for malformed
JSON.

Grail used to alias the name straight onto ValueError:

    self at: #JSONDecodeError put: ValueError

which made ``except json.JSONDecodeError'' catch EVERY ValueError, and left
the five documented attributes missing entirely.  Real code reads them --
they are the only way to report WHERE a document went wrong.

Attributes (CPython 3.14):
  msg     the unformatted reason, e.g. ''Expecting value''
  doc     the JSON document being parsed
  pos     the start index of doc where parsing failed -- ZERO-BASED
  lineno  the line of pos, 1-based
  colno   the column of pos, 1-based

``str(e)'' is ``{msg}: line {lineno} column {colno} (char {pos})'', and that
formatted string -- not msg -- is the single element of ``args''.

Hierarchy:
Object
  ...
    Exception
      ValueError
        JSONDecodeError(msg doc pos lineno colno)
'
%

expectvalue /Class
doit
JSONDecodeError category: 'Grail-Exceptions'
%

! ------------------- Remove existing behavior
expectvalue /Metaclass3
doit
JSONDecodeError removeAllMethods: 0.
JSONDecodeError removeAllMethods: 1.
JSONDecodeError class removeAllMethods: 0.
JSONDecodeError class removeAllMethods: 1.
%

set compile_env: 1

category: 'Grail-Accessing'
method: JSONDecodeError
msg
	"The unformatted reason, without the line/column suffix."

	^ msg
%

category: 'Grail-Accessing'
method: JSONDecodeError
doc
	"The JSON document being parsed."

	^ doc
%

category: 'Grail-Accessing'
method: JSONDecodeError
pos
	"The start index in doc where parsing failed.  ZERO-BASED, as CPython
	reports it -- Grail's parser works in 1-based Smalltalk indices and
	converts on the way in."

	^ pos
%

category: 'Grail-Accessing'
method: JSONDecodeError
lineno
	"The 1-based line of pos."

	^ lineno
%

category: 'Grail-Accessing'
method: JSONDecodeError
colno
	"The 1-based column of pos."

	^ colno
%

category: 'Grail-Signalling'
classmethod: JSONDecodeError
___lineColOf___: aPos in: aDoc
	"Answer { lineno. colno } for the ZERO-BASED aPos within aDoc, matching
	CPython's

	    lineno = doc.count(''\n'', 0, pos) + 1
	    colno  = pos - doc.rfind(''\n'', 0, pos)

	Counted over the first aPos characters, so a pos of 0 -- or one past the
	end, which is where ''Expecting value'' lands on empty input -- is well
	defined.  lastNl is the 1-based index of the last newline in that span,
	or 0 when there is none, which reproduces rfind's -1 answer exactly."

	| nl lastNl limit |
	nl := 0.
	lastNl := 0.
	limit := aPos @env0:min: aDoc @env0:size.
	1 @env0:to: limit do: [:i |
		(aDoc @env0:at: i) @env0:= Character @env0:lf ifTrue: [
			nl := nl @env0:+ 1.
			lastNl := i]].
	^ Array @env0:with: nl @env0:+ 1 with: aPos @env0:- lastNl @env0:+ 1
%

category: 'Grail-Signalling'
classmethod: JSONDecodeError
___signalMsg___: aMsg doc: aDoc pos: aPos
	"Signal a JSONDecodeError for ZERO-BASED aPos in aDoc.

	``args'' holds the FORMATTED string, not aMsg: CPython's __init__ calls
	``ValueError.__init__(self, errmsg)'' after building it, so
	``e.args[0]'' and ``str(e)'' agree and carry the position."

	| inst lc text |
	lc := self ___lineColOf___: aPos in: aDoc.
	text := aMsg @env0:asString
		@env0:, ': line ' @env0:, (lc @env0:at: 1) @env0:printString
		@env0:, ' column ' @env0:, (lc @env0:at: 2) @env0:printString
		@env0:, ' (char ' @env0:, aPos @env0:printString @env0:, ')'.
	inst := self ___new___.
	inst
		___setMsg___: aMsg @env0:asString
		doc: aDoc
		pos: aPos
		lineno: (lc @env0:at: 1)
		colno: (lc @env0:at: 2).
	inst ___args___: { text }.
	inst ___signal___: text
%

category: 'Grail-Signalling'
method: JSONDecodeError
___setMsg___: aMsg doc: aDoc pos: aPos lineno: aLine colno: aCol
	msg := aMsg.
	doc := aDoc.
	pos := aPos.
	lineno := aLine.
	colno := aCol
%

! ___pythonValueAttrs___ MUST be compiled in env 0: Object >> ___pyAttrLoad___
! probes it with a plain env-0 respondsTo: / send.

set compile_env: 0

category: 'Grail-Python Attribute Hook'
classmethod: JSONDecodeError
___pythonValueAttrs___
	"The five documented attributes are VALUES, not callables, so a Python
	read must invoke the accessor rather than wrap it as a BoundMethod --
	``e.msg'' is a string, not a bound method object.

	Extends the inherited set (args, __notes__, __traceback__, the PEP 3134
	chaining attributes) rather than replacing it; BaseException builds a
	fresh IdentitySet per call, so adding to it is safe."

	^ super ___pythonValueAttrs___
		add: #'msg';
		add: #'doc';
		add: #'pos';
		add: #'lineno';
		add: #'colno';
		yourself
%

set compile_env: 0
