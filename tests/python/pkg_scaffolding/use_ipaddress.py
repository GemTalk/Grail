import ipaddress


def parse_ipv4(s):
    addr = ipaddress.ip_address(s)
    return str(addr)


def packed_int(s):
    return int(ipaddress.ip_address(s))


def is_loopback(s):
    return ipaddress.ip_address(s).is_loopback


def is_private(s):
    return ipaddress.ip_address(s).is_private


def is_global(s):
    return ipaddress.ip_address(s).is_global


def is_link_local(s):
    return ipaddress.ip_address(s).is_link_local


def is_multicast(s):
    return ipaddress.ip_address(s).is_multicast


def network_str(s):
    return str(ipaddress.ip_network(s))


def network_contains(net_s, addr_s):
    net = ipaddress.ip_network(net_s)
    addr = ipaddress.ip_address(addr_s)
    return addr in net


def network_broadcast(s):
    return str(ipaddress.ip_network(s).broadcast_address)


def reject_ipv6():
    try:
        ipaddress.ip_address("::1")
        return "no-error"
    except ValueError:
        return "rejected"


def reject_bad_octet():
    try:
        ipaddress.ip_address("999.0.0.1")
        return "no-error"
    except ValueError:
        return "rejected"
