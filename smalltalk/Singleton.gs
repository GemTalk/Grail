! ------------------- Remove existing behavior from Singleton
removeallmethods Singleton
removeallclassmethods Singleton
! ------------------- Class methods for Singleton
category: 'accessing'
classmethod: Singleton
singleton

	singleton ifNil: [singleton := self new].
	^singleton
%
! ------------------- Instance methods for Singleton
