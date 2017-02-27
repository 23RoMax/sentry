from __future__ import absolute_import

import six

from sentry.api.serializers import Serializer, register, serialize
from sentry.models import (
    ProjectDSymFile, GlobalDSymFile, VersionDSymFile, DSymApp
)


@register(ProjectDSymFile)
@register(GlobalDSymFile)
class DSymFileSerializer(Serializer):
    def serialize(self, obj, attrs, user):
        d = {
            'id': six.text_type(obj.id),
            'uuid': obj.uuid,
            'cpuName': obj.cpu_name,
            'objectName': obj.object_name,
            'symbolType': obj.dsym_type,
            'headers': obj.file.headers,
            'size': obj.file.size,
            'sha1': obj.file.checksum,
            'dateCreated': obj.file.timestamp,
        }
        return d


@register(VersionDSymFile)
class VersionDSymFileSerializer(Serializer):
    def serialize(self, obj, attrs, user):
        d = {
            'id': six.text_type(obj.id),
            'version': obj.version,
            'build': obj.build,
            'dateAdded': obj.date_added,
            'appID': obj.app_id,
            'dsym': serialize(obj.dsym_file)
        }
        return d


@register(DSymApp)
class DSymAppSerializer(Serializer):
    def serialize(self, obj, attrs, user):
        d = {
            'id': six.text_type(obj.id),
            'iconUrl': obj.data.get('icon_url', None),
            'bundleID': obj.data.get('bundle_id', None),
            'name': obj.data.get('name', None),
            'appID': obj.data.get('id', None),
            'platforms': ', '.join(obj.data.get('platforms', None)),
            'lastSync': obj.last_synced,
        }
        return d
