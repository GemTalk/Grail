"Marker returned by enum.member(x) (and the @member decorator): wraps x so ___grailBuildMembers: FORCES x to be a member even when the ordinary rules would skip it -- a nested class, or a descriptor, which CPython _EnumDict would otherwise leave a plain class attribute (test_enum test_nested_classes_in_enum_with_member).  The exact mirror of GrailEnumNonmember."
Class {
	#name : 'GrailEnumMember',
	#superclass : 'Object',
	#instVars : [
		'value'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Member' }
GrailEnumMember class >> on: aValue [
	"Wrap aValue as a forced-member marker."

	^ self new setValue: aValue; yourself

]

{ #category : 'Grail-Member' }
GrailEnumMember >> setValue: aValue [
	value := aValue

]

{ #category : 'Grail-Member' }
GrailEnumMember >> value [
	"The wrapped value that becomes the member's value."

	^ value

]
