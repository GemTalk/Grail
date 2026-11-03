"
CPython's struct sequence (Objects/structseq.c), the shape time.struct_time,
os.stat_result and sys.version_info share: a tuple of its sequence fields --
the named ones, then any unnamed -- with its named-only fields beside it, read
by name as the named ones are.

A subclass says which fields it has (___sequenceNames___,
___unnamedFieldCount___, ___namedOnlyFields___) and the dotted name CPython's
messages and repr use (___typeName___).  The rest is here: the constructor's
checks, repr, __reduce__, __replace__, read-only fields and the n_fields
family, which each of them used to carry a copy of, or lack.

Hidden from __mro__ (importlib class >> ___isHiddenBase___:of:): each of
CPython's derives from tuple directly.
"
Class {
	#name : 'PyStructSequence',
	#superclass : 'tuple',
	#category : 'Grail-Collections-Sequenceable'
}

{ #category : 'Instance Creation' }
PyStructSequence class >> ___field: aName in: aDictOrNil [
	"A named-only field the constructor's dict gives, or None.  aDictOrNil is
	nil when no dict was given."

	| none |
	none := System myUserProfile symbolList objectNamed: #'None'.
	aDictOrNil isNil ifTrue: [^ none].
	^ aDictOrNil @env1:get: aName asString _: none

]

{ #category : 'Grail-Fields' }
PyStructSequence class >> ___fieldCount___ [
	"n_fields: every field, sequence and named-only."

	^ self ___sequenceFieldCount___ + self ___namedOnlyFields___ size

]

{ #category : 'Grail-Fields' }
PyStructSequence class >> ___fieldNames___ [
	"The names CPython's members have, in their order: the named sequence
	fields, then the named-only ones.  An unnamed field has none."

	^ self ___sequenceNames___ , self ___namedOnlyFields___

]

{ #category : 'Grail-Fields' }
PyStructSequence class >> ___namedOnlyFields___ [
	"The fields past the tuple, read by name only."

	^ #()

]

{ #category : 'Instance Creation' }
PyStructSequence class >> ___sequence___: anArray named: aDictOrNil [
	"CPython's structseq_new (Objects/structseq.c:163-266), for an Array
	already checked to hold between n_sequence_fields and n_fields items.  The
	sequence fields are the tuple; any more items fill the named-only fields
	in order, then aDictOrNil fills the rest by name, and a field still unset
	is None."

	| instance count |
	count := self ___sequenceFieldCount___.
	instance := self withAll: (anArray copyFrom: 1 to: count).
	self ___namedOnlyFields___ doWithIndex: [:name :index |
		instance
			dynamicInstVarAt: name
			put: (anArray size >= (count + index)
				ifTrue: [anArray at: count + index]
				ifFalse: [self ___field: name in: aDictOrNil])].
	^ instance

]

{ #category : 'Grail-Fields' }
PyStructSequence class >> ___sequenceFieldCount___ [
	"n_sequence_fields: the length of the tuple."

	^ self ___sequenceNames___ size + self ___unnamedFieldCount___

]

{ #category : 'Grail-Fields' }
PyStructSequence class >> ___sequenceNames___ [
	"The named fields of the tuple, in order; any unnamed ones follow them."

	^ #()

]

{ #category : 'Grail-Fields' }
PyStructSequence class >> ___typeName___ [
	"CPython's tp_name: the dotted name its messages and its repr use."

	^ self name asString

]

{ #category : 'Grail-Fields' }
PyStructSequence class >> ___unnamedFieldCount___ [
	"n_unnamed_fields: sequence fields read by index only."

	^ 0

]
