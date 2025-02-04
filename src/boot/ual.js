import { boot } from "quasar/wrappers";
import { UAL } from "universal-authenticator-library";
import { Anchor } from "ual-anchor";
import { CleosAuthenticator } from "@telosnetwork/ual-cleos";
import { copyToClipboard } from "quasar";

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(async ({ app, store }) => {
  const mainChain = {
    chainId: process.env.NETWORK_CHAIN_ID,
    origin: process.env.TELOS_ORIGIN,
    rpcEndpoints: [
      {
        protocol: process.env.NETWORK_PROTOCOL,
        host: process.env.NETWORK_HOST,
        port: process.env.NETWORK_PORT,
      },
    ],
  };

  async function loginHandler() {
    let accountName = "eosio";
    let permission = "active";
    if (localStorage.getItem("autoLogin") === "cleos") {
      accountName = localStorage.getItem("account");
    } else {
      await new Promise((resolve) => {
        app.config.globalProperties.$q
          .dialog({
            color: "primary",
            title: "Connect to cleos",
            message: "Account name",
            prompt: {
              model: "",
              type: "text",
            },
            cancel: true,
            persistent: true,
          })
          .onOk((data) => {
            accountName = data != "" ? data : "eosio";
          })
          .onCancel(() => {
            throw "Cancelled!";
          })
          .onDismiss(() => {
            resolve(true);
          });
      });
      await new Promise((resolve) => {
        app.config.globalProperties.$q
          .dialog({
            color: "primary",
            title: "Connect to cleos",
            message: "Account permission",
            options: {
              type: "radio",
              model: [],
              items: [
                { label: "Active", value: "active" },
                { label: "Owner", value: "owner" },
              ],
            },
            cancel: true,
            persistent: true,
          })
          .onOk((data) => {
            permission = data;
          })
          .onCancel(() => {
            throw "Cancelled!";
          })
          .onDismiss(() => {
            resolve(true);
          });
      });
    }
    return {
      accountName,
      permission,
    };
  }

  async function signHandler(trx) {
    const trxJSON = JSON.stringify(
      Object.assign(
        {
          delay_sec: 0,
          max_cpu_usage_ms: 0,
        },
        trx
      ),
      null,
      4
    );
    await new Promise((resolve) => {
      app.config.globalProperties.$q
        .dialog({
          color: "primary",
          message: `<pre>cleos -u https://${process.env.NETWORK_HOST} push transaction '${trxJSON}'</pre>`,
          html: true,
          cancel: true,
          fullWidth: true,
          ok: {
            label: "Copy",
          },
        })
        .onOk(() => {
          copyToClipboard(
            `cleos -u https://${process.env.NETWORK_HOST} push transaction '${trxJSON}`
          )
            .then(() => {
              app.config.globalProperties.$q.notify({
                color: "green-4",
                textColor: "white",
                message: "Copied to clipboard",
                timeout: 1000,
              });
            })
            .catch(() => {
              app.config.globalProperties.$q.notify({
                color: "red-8",
                textColor: "white",
                message: "Could not copy",
                timeout: 1000,
              });
            });
        })
        .onCancel(() => {
          throw "Cancelled!";
        })
        .onDismiss(() => {
          resolve(true);
        });
    });
  }

  const authenticators = [
    new Anchor([mainChain], { appName: process.env.APP_NAME }),
    new CleosAuthenticator([mainChain], {
      appName: process.env.APP_NAME,
      loginHandler,
      signHandler,
    }),
  ];

  const ual = new UAL([mainChain], "tet-ual", authenticators);
  store["$ual"] = ual;
  app.config.globalProperties.$ual = ual;
});
