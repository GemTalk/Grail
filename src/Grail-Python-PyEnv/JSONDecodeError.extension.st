Extension { #name : 'JSONDecodeError' }

{ #category : 'Grail-Signalling' }
JSONDecodeError class >> ___lineColOf___: aPos in: aDoc [
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

]

{ #category : 'Grail-Signalling' }
JSONDecodeError class >> ___signalMsg___: aMsg doc: aDoc pos: aPos [
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

]

{ #category : 'Grail-Signalling' }
JSONDecodeError >> ___setMsg___: aMsg doc: aDoc pos: aPos lineno: aLine colno: aCol [
	msg := aMsg.
	doc := aDoc.
	pos := aPos.
	lineno := aLine.
	colno := aCol

]

{ #category : 'Grail-Accessing' }
JSONDecodeError >> colno [
	"The 1-based column of pos."

	^ colno

]

{ #category : 'Grail-Accessing' }
JSONDecodeError >> doc [
	"The JSON document being parsed."

	^ doc

]

{ #category : 'Grail-Accessing' }
JSONDecodeError >> lineno [
	"The 1-based line of pos."

	^ lineno

]

{ #category : 'Grail-Accessing' }
JSONDecodeError >> msg [
	"The unformatted reason, without the line/column suffix."

	^ msg

]

{ #category : 'Grail-Accessing' }
JSONDecodeError >> pos [
	"The start index in doc where parsing failed.  ZERO-BASED, as CPython
	reports it -- Grail's parser works in 1-based Smalltalk indices and
	converts on the way in."

	^ pos

]
