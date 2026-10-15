"Python ``json.JSONDecodeError`` -- ValueError subclass raised for malformed
JSON.

Grail used to alias the name straight onto ValueError:

    self at: #JSONDecodeError put: ValueError

which made ``except json.JSONDecodeError' catch EVERY ValueError, and left
the five documented attributes missing entirely.  Real code reads them --
they are the only way to report WHERE a document went wrong.

Attributes (CPython 3.14):
  msg     the unformatted reason, e.g. 'Expecting value'
  doc     the JSON document being parsed
  pos     the start index of doc where parsing failed -- ZERO-BASED
  lineno  the line of pos, 1-based
  colno   the column of pos, 1-based

``str(e)' is ``{msg}: line {lineno} column {colno} (char {pos})', and that
formatted string -- not msg -- is the single element of ``args'.

Hierarchy:
Object
  ...
    Exception
      ValueError
        JSONDecodeError(msg doc pos lineno colno)

"
Class {
	#name : 'JSONDecodeError',
	#superclass : 'ValueError',
	#instVars : [
		'msg',
		'doc',
		'pos',
		'lineno',
		'colno'
	],
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Hook' }
JSONDecodeError class >> ___pythonValueAttrs___ [
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

]
