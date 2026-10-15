Class {
	#name : 'sys_version_info',
	#superclass : 'tuple',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Introspection' }
sys_version_info class >> ___pythonValueAttrs___ [
	"The fields and the struct-sequence counts are DATA attributes, read
	without a call -- ``v.major'' is 3, not a bound method."

	^ IdentitySet new
		add: #major; add: #minor; add: #micro; add: #releaselevel; add: #serial;
		add: #n_fields; add: #n_sequence_fields; add: #n_unnamed_fields;
		"Inherited from tuple, which lists it -- see struct_time's copy."
		add: #'__dict__';
		yourself

]
