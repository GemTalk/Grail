"One entry of a GrailMethodTable for a method no class owns: the method and
the value recorded against it, in an ephemeron keyed by the method.

As an ephemeron it holds neither strongly.  The value is traced only while
the method is reachable some other way, so a value that leads back to its own
method -- a doit's scope holds the functions the doit defined, whose blocks
lead to the doit -- does not keep the method alive.  Once the method is
garbage, mourn releases both and the table sweeps the entry out.
"
Class {
	#name : 'GrailMethodTableEntry',
	#superclass : 'Object',
	#instVars : [
		'key',
		'value'
	],
	#category : 'Grail-Weak'
}

{ #category : 'Grail-Weak-constructors' }
GrailMethodTableEntry class >> key: aMethod value: aValue [
	"A new entry, made an ephemeron.  When that is refused (an object
	 beEphemeron: cannot take), the entry stays an ordinary object and holds
	 its method strongly, as every method-keyed table did before."

	| entry |
	entry := self new setKey: aMethod value: aValue.
	[entry beEphemeron: true] on: Error do: [:ex | ex return: nil].
	^ entry

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTableEntry >> key [
	"The method, or nil once it has been mourned."

	^ key

]

{ #category : 'Grail-Weak-finalization' }
GrailMethodTableEntry >> mourn [
	"Sent by the finalization process once GC finds the method reachable only
	 through ephemerons.  Release both slots and nothing else: this can run at
	 any point in the session, inside a compile or in the middle of the
	 table's own code, so it touches only this entry."

	key := nil.
	value := nil

]

{ #category : 'Grail-Weak-private' }
GrailMethodTableEntry >> setKey: aMethod value: aValue [

	key := aMethod.
	value := aValue

]

{ #category : 'Grail-Weak-private' }
GrailMethodTableEntry >> setValue: aValue [

	value := aValue

]

{ #category : 'Grail-Weak-accessing' }
GrailMethodTableEntry >> value [

	^ value

]
