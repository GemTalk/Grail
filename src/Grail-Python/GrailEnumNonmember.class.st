"Marker returned by enum.nonmember(x) (and the @nonmember decorator): wraps x so ___grailBuildMembers: stores x as a PLAIN class attribute and drops the name from _member_names_ / iteration (CPython nonmember -- Outer.Inner is Inner, MyTypes.f is float, Example.ALL == 3)."
Class {
	#name : 'GrailEnumNonmember',
	#superclass : 'Object',
	#instVars : [
		'value'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Nonmember' }
GrailEnumNonmember class >> on: aValue [
	"Wrap aValue as a nonmember marker."

	^ self new setValue: aValue; yourself

]

{ #category : 'Grail-Nonmember' }
GrailEnumNonmember >> setValue: aValue [
	value := aValue

]

{ #category : 'Grail-Nonmember' }
GrailEnumNonmember >> value [
	"The wrapped value the enum stores as a plain class attribute."

	^ value

]
