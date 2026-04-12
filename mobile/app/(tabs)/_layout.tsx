import { Tabs } from "expo-router";
import TabBar from "../../components/TabBar";
import CreatePostModal from "../../components/CreatePostModal";
import { useCreatePost } from "../../contexts/CreatePostContext";
import { useItems } from "../../contexts/ItemsContext";

function TabsWithModal() {
  const { isOpen, close, onItemCreated } = useCreatePost();
  const { refreshItems } = useItems();

  const handleAdd = (item: any) => {
    onItemCreated(item);
    refreshItems();
  };

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tabs.Screen name="feed"     options={{ title: "Feed" }} />
        <Tabs.Screen name="map"      options={{ title: "Maps" }} />
        <Tabs.Screen name="create"   options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ title: "Messages" }} />
        <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      </Tabs>

      <CreatePostModal
        visible={isOpen}
        onClose={close}
        onAdd={handleAdd}
      />
    </>
  );
}

export default function TabsLayout() {
  return <TabsWithModal />;
}
