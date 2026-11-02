Class {
	#name : 'sys_version_info',
	#superclass : 'PyStructSequence',
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

{ #category : 'Grail-Fields' }
sys_version_info class >> ___sequenceNames___ [
	^ #(#'major' #'minor' #'micro' #'releaselevel' #'serial')

]

{ #category : 'Grail-Fields' }
sys_version_info class >> ___typeName___ [
	^ 'sys.version_info'

]
