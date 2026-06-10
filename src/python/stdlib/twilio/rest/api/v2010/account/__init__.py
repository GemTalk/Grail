r"""
    Twilio - Api / V2010 / Account.

    GRAIL NOTE: trimmed from the twilio 9.10.9 source drop.  Upstream
    is ~1550 generated lines importing every Account sub-resource
    (addresses, calls, conferences, sip, usage, ...).  Grail vendors
    the Messages path only, so AccountContext / AccountList keep their
    upstream shape but expose just ``messages``; the AccountInstance
    payload class and the other ~29 sub-resource properties return as
    their modules are vendored.
"""

from typing import Optional

from twilio.base import values
from twilio.base.instance_context import InstanceContext
from twilio.base.list_resource import ListResource
from twilio.base.version import Version
from twilio.rest.api.v2010.account.message import MessageList


class AccountContext(InstanceContext):

    def __init__(self, version: Version, sid: str):
        """
        Initialize the AccountContext

        :param version: Version that contains the resource
        :param sid: The Account Sid that uniquely identifies the account
        """
        super().__init__(version)

        # Path Solution
        self._solution = {
            "sid": sid,
        }
        self._uri = "/Accounts/{sid}.json".format(**self._solution)

        self._messages: Optional[MessageList] = None

    @property
    def messages(self) -> MessageList:
        """
        Access the messages
        """
        if self._messages is None:
            self._messages = MessageList(
                self._version,
                self._solution["sid"],
            )
        return self._messages

    def __repr__(self) -> str:
        """
        Provide a friendly representation

        :returns: Machine friendly representation
        """
        context = " ".join("{}={}".format(k, v) for k, v in self._solution.items())
        return "<Twilio.Api.V2010.AccountContext {}>".format(context)


class AccountList(ListResource):

    def __init__(self, version: Version):
        """
        Initialize the AccountList

        :param version: Version that contains the resource

        """
        super().__init__(version)

        self._uri = "/Accounts.json"

    def get(self, sid: str) -> AccountContext:
        """
        Constructs an AccountContext

        :param sid: The Account Sid that uniquely identifies the account
        """
        return AccountContext(self._version, sid=sid)

    def __call__(self, sid: str) -> AccountContext:
        """
        Constructs an AccountContext

        :param sid: The Account Sid that uniquely identifies the account
        """
        return AccountContext(self._version, sid=sid)

    def __repr__(self) -> str:
        """
        Provide a friendly representation

        :returns: Machine friendly representation
        """
        return "<Twilio.Api.V2010.AccountList>"
