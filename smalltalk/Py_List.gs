! ------------------- Remove existing behavior from Py_List
expectvalue /Metaclass3       
doit
Py_List removeAllMethods.
Py_List class removeAllMethods.
%
! ------------------- Class methods for Py_List
! ------------------- Instance methods for Py_List
set compile_env: 0
category: 'other'
method: Py_List
append: arguments keywords: keywords

^self add: arguments first
%
